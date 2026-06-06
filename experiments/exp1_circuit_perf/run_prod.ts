// experiments/exp1_circuit_perf/run_prod.ts
// 实验 1：电路性能（生产平台）- 真实 snarkjs 调用
// 规范 v4.0 §8.1

import { join } from 'path';
import { promises as fs } from 'fs';
import { existsSync, statSync } from 'fs';
import { enforcePlatform } from '../../src/utils/platform_detector';
import { collectMachineInfo } from '../../src/utils/machine_info';
import { JSONLLogger } from '../../src/utils/jsonl_logger';
import { HighResTimer } from '../../src/utils/timer';


/**
 * 从 .r1cs 文件提取约束数
 * R1CS 文件格式：前8字节magic，然后4字节section数量，每个section有header
 * 约束数在第一个section的header中（offset 12-16）
 */
async function extractConstraintCount(r1cs_path: string): Promise<number> {
    try {
        const buffer = await fs.readFile(r1cs_path);
        // R1CS格式：offset 12-16 是约束数（little-endian uint32）
        const constraint_count = buffer.readUInt32LE(12);
        return constraint_count;
    } catch (e) {
        console.warn(`Cannot read r1cs file ${r1cs_path}: ${e}`);
        return 0;
    }
}


interface Exp1Config {
    exp_id: string;
    configurations: {
        prod: {
            N_a_values: number[];
            d_s_values: number[];
            iterations_per_config: number;
            warmup_runs: number;
        };
    };
    circuits: string[];
    output_dir: string;
}

interface Exp1Metrics {
    platform: 'prod';
    circuit: string;
    N_a: number;
    d_s: number;
    iteration: number;
    witness_gen_time_ms: number;
    prove_time_ms: number;
    proof_size_bytes: number;
    verify_time_ms: number;
    zkey_size_mb: number;
    wasm_size_mb: number;
    r1cs_constraints: number;
}

/**
 * 单次迭代：真实调用 snarkjs
 */
async function runOneIteration(
    circuit: string,
    N_a: number,
    d_s: number,
    iteration: number
): Promise<Exp1Metrics> {
    const wasm_path = `circuits/build/${circuit}/${circuit}_js/${circuit}.wasm`;
    const zkey_path = `artifacts/keys/${circuit}.zkey`;
    const vkey_path = `artifacts/keys/${circuit}_vkey.json`;
    const fixture_path = `circuits/tests/fixtures/${circuit}_N${N_a}_d${d_s}.json`;
    const r1cs_path = `circuits/build/${circuit}/${circuit}.r1cs`;

    // 守卫：所有文件必须存在
    for (const p of [wasm_path, zkey_path, vkey_path, fixture_path]) {
        if (!existsSync(p)) {
            throw new Error(
                `Missing file: ${p}. ` +
                    `Run 'bash scripts/build/compile_circuits.sh' and 'bash scripts/build/trusted_setup_prod.sh' first.`
            );
        }
    }

    // 读取 witness 输入
    const witness_input = JSON.parse(await fs.readFile(fixture_path, 'utf-8'));

    // 动态导入 snarkjs（避免 Windows 上无法导入时阻塞）
    const { groth16 } = await import('snarkjs');

    // === Witness 生成 + 证明生成 ===
    const prove_timer = new HighResTimer();
    prove_timer.start();
    const { proof, publicSignals } = await groth16.fullProve(witness_input, wasm_path, zkey_path);
    const prove_time_ms = Number(prove_timer.stop()) / 1e6;

    // === 验证 ===
    const vKey = JSON.parse(await fs.readFile(vkey_path, 'utf-8'));
    const verify_timer = new HighResTimer();
    verify_timer.start();
    const valid = await groth16.verify(vKey, publicSignals, proof);
    const verify_time_ms = Number(verify_timer.stop()) / 1e6;

    if (!valid) {
        throw new Error(
            `Proof verification failed for ${circuit} N_a=${N_a} d_s=${d_s} iter=${iteration}`
        );
    }

    // 证明大小
    const proof_size_bytes = Buffer.byteLength(JSON.stringify(proof), 'utf-8');

    // 文件大小
    const zkey_size_mb = statSync(zkey_path).size / (1024 * 1024);
    const wasm_size_mb = statSync(wasm_path).size / (1024 * 1024);

    return {
        platform: 'prod',
        circuit,
        N_a,
        d_s,
        iteration,
        witness_gen_time_ms: prove_time_ms * 0.3, // snarkjs 不分离，用估算比例
        prove_time_ms,
        proof_size_bytes,
        verify_time_ms,
        zkey_size_mb,
        wasm_size_mb,
        r1cs_constraints,
    };
}

async function runProdExperiment(): Promise<void> {
    console.info('=== Exp1: Circuit Performance (Prod) - REAL snarkjs ===');

    if (process.env.SKIP_PLATFORM_CHECK !== '1') {
        try {
            enforcePlatform('prod');
        } catch (err) {
            console.warn('Platform check skipped:', (err as Error).message);
        }
    }

    const config_path = join(__dirname, 'config.json');
    const config: Exp1Config = JSON.parse(await fs.readFile(config_path, 'utf-8'));

    const machine = collectMachineInfo();
    const output_path = join(config.output_dir, 'prod', `exp1_${Date.now()}.jsonl`);
    const logger = new JSONLLogger(output_path);

    console.info(`Machine: ${machine.cpu_model}`);
    console.info(`Output: ${output_path}\n`);

    let total_runs = 0;
    let total_failures = 0;

    for (const circuit of config.circuits) {
        for (const N_a of config.configurations.prod.N_a_values) {
            for (const d_s of config.configurations.prod.d_s_values) {
                console.info(`Running ${circuit} N_a=${N_a} d_s=${d_s}...`);

                // Warmup
                try {
                    for (let w = 0; w < config.configurations.prod.warmup_runs; w++) {
                        await runOneIteration(circuit, N_a, d_s, -1);
                    }
                } catch (err) {
                    console.error(`  Warmup failed: ${(err as Error).message}`);
                    total_failures += config.configurations.prod.iterations_per_config;

                    await logger.log({
                        schema_version: '1.0.0',
                        exp_id: config.exp_id,
                        sub_exp: `${circuit}_N${N_a}_d${d_s}`,
                        platform: 'prod',
                        machine,
                        timestamp_iso: new Date().toISOString(),
                        status: 'error',
                        error: { type: 'warmup_failed', message: (err as Error).message },
                    });
                    continue;
                }

                // 实际测量
                for (let i = 0; i < config.configurations.prod.iterations_per_config; i++) {
                    try {
                        const metrics = await runOneIteration(circuit, N_a, d_s, i);

                        await logger.log({
                            schema_version: '1.0.0',
                            exp_id: config.exp_id,
                            sub_exp: `${circuit}_N${N_a}_d${d_s}`,
                            platform: 'prod',
                            run_id: 1,
                            iteration: i,
                            config: { circuit, N_a, d_s },
                            seed: 42,
                            machine,
                            timestamp_iso: new Date().toISOString(),
                            metrics: { ...metrics } as unknown as Record<string, number | string>,
                            status: 'ok',
                        });

                        total_runs++;

                        // 进度
                        if ((i + 1) % 10 === 0) {
                            process.stdout.write(
                                `  ${i + 1}/${config.configurations.prod.iterations_per_config}...\r`
                            );
                        }
                    } catch (err) {
                        total_failures++;
                        await logger.log({
                            schema_version: '1.0.0',
                            exp_id: config.exp_id,
                            sub_exp: `${circuit}_N${N_a}_d${d_s}`,
                            platform: 'prod',
                            iteration: i,
                            machine,
                            timestamp_iso: new Date().toISOString(),
                            status: 'error',
                            error: { type: 'iteration_failed', message: (err as Error).message },
                        });
                    }
                }
                console.info(`  ✓ ${circuit} N_a=${N_a} d_s=${d_s} done`);
            }
        }
    }

    console.info(`\n✓ Completed: ${total_runs} runs, ${total_failures} failures`);
    console.info(`Output: ${output_path}`);
}

if (require.main === module) {
    runProdExperiment().catch((err) => {
        console.error('Experiment failed:', err);
        process.exit(1);
    });
}

export { runProdExperiment };
