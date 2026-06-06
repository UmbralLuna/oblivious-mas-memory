// experiments/exp1_circuit_perf/run_fixed.ts
// Exp1: 使用 delegate_test 电路（跳过 G1 签名验证）

import { join } from 'path';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { collectMachineInfo } from '../../src/utils/machine_info';
import { JSONLLogger } from '../../src/utils/jsonl_logger';
import { WitnessBuilderDelegate } from '../../src/prover/witness_builder_delegate';
import { generateDelegateProof } from '../../src/prover/prove';
import { verifyDelegateProof } from '../../src/verifier/verify';

interface ConfigEntry {
    N_a: number;
    d_s: number;
    wasmPath: string;
    zkeyPath: string;
    vkeyPath: string;
}

async function runExp1(): Promise<void> {
    console.info('=== Exp1: Circuit Performance (delegate_test) ===');
    const machine = collectMachineInfo();
    console.info('Machine: ' + machine.cpu);

    const output_dir = 'analysis/results/exp1_circuit_perf/prod';
    await fs.mkdir(output_dir, { recursive: true });
    const output_path = join(output_dir, 'exp1_' + Date.now() + '.jsonl');
    const logger = new JSONLLogger(output_path);

    // 默认 wasm（N16_d6 编译的）
    const defaultWasm = 'circuits/build/delegate_test/delegate_test_js/delegate_test.wasm';

    // 所有配置（使用同一个 wasm，但不同的 zkey/vkey）
    const configs: ConfigEntry[] = [
        { N_a: 4, d_s: 4, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N4_d4.zkey', vkeyPath: 'artifacts/keys/delegate_test_N4_d4_vkey.json' },
        { N_a: 4, d_s: 6, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N4_d6.zkey', vkeyPath: 'artifacts/keys/delegate_test_N4_d6_vkey.json' },
        { N_a: 8, d_s: 4, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N8_d4.zkey', vkeyPath: 'artifacts/keys/delegate_test_N8_d4_vkey.json' },
        { N_a: 8, d_s: 6, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N8_d6.zkey', vkeyPath: 'artifacts/keys/delegate_test_N8_d6_vkey.json' },
        { N_a: 16, d_s: 4, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N16_d4.zkey', vkeyPath: 'artifacts/keys/delegate_test_N16_d4_vkey.json' },
        { N_a: 16, d_s: 6, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N16_d6.zkey', vkeyPath: 'artifacts/keys/delegate_test_N16_d6_vkey.json' },
        { N_a: 32, d_s: 4, wasmPath: defaultWasm, zkeyPath: 'artifacts/keys/delegate_test_N32_d4.zkey', vkeyPath: 'artifacts/keys/delegate_test_N32_d4_vkey.json' },
    ];

    const ITERATIONS = 100;
    let total_ok = 0;
    let total_err = 0;

    for (const cfg of configs) {
        const label = 'N' + cfg.N_a + '_d' + cfg.d_s;
        console.info('\nRunning ' + label + '...');

        // 检查文件存在
        if (!existsSync(cfg.wasmPath) || !existsSync(cfg.zkeyPath) || !existsSync(cfg.vkeyPath)) {
            console.info('  SKIP: missing files');
            continue;
        }

        // 构建 witness
        let witness: any;
        try {
            const builder = new WitnessBuilderDelegate(cfg.N_a, cfg.d_s);
            witness = await builder.buildValidDelegation(42);
        } catch (err) {
            console.info('  Witness build failed: ' + (err as Error).message);
            for (let i = 0; i < ITERATIONS; i++) {
                total_err++;
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: 'exp1',
                    sub_exp: 'delegate',
                    platform: 'prod',
                    baseline: 'ours',
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    metrics: { N_a: cfg.N_a, d_s: cfg.d_s, config: label },
                    status: 'error',
                    error: { type: 'witness', message: (err as Error).message },
                });
            }
            continue;
        }

        // 预热
        try {
            const warmup = await generateDelegateProof(witness as any, cfg.wasmPath, cfg.zkeyPath);
            const vr = await verifyDelegateProof(warmup.proof, warmup.publicSignals, cfg.vkeyPath);
            if (!vr.valid) {
                console.info('  Warmup verify FAILED');
                continue;
            }
            console.info('  Warmup OK: prove=' + warmup.timing.total_ms.toFixed(0) + 'ms, verify=' + vr.verify_ms.toFixed(0) + 'ms');
        } catch (err) {
            console.info('  Warmup failed: ' + (err as Error).message);
            continue;
        }

        // 跑 iterations
        for (let i = 0; i < ITERATIONS; i++) {
            try {
                const seed = 42 + i;
                const builder = new WitnessBuilderDelegate(cfg.N_a, cfg.d_s);
                const w = await builder.buildValidDelegation(seed);

                const proofResult = await generateDelegateProof(w as any, cfg.wasmPath, cfg.zkeyPath);
                const verifyResult = await verifyDelegateProof(proofResult.proof, proofResult.publicSignals, cfg.vkeyPath);

                total_ok++;
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: 'exp1',
                    sub_exp: 'delegate',
                    platform: 'prod',
                    baseline: 'ours',
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    metrics: {
                        N_a: cfg.N_a,
                        d_s: cfg.d_s,
                        config: label,
                        prove_ms: proofResult.timing.total_ms,
                        verify_ms: verifyResult.verify_ms,
                        valid: verifyResult.valid ? 1 : 0,
                    },
                    status: 'ok',
                });

                if ((i + 1) % 20 === 0) {
                    process.stdout.write('  ' + (i + 1) + '/' + ITERATIONS + '\r');
                }
            } catch (err) {
                total_err++;
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: 'exp1',
                    sub_exp: 'delegate',
                    platform: 'prod',
                    baseline: 'ours',
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    metrics: { N_a: cfg.N_a, d_s: cfg.d_s, config: label },
                    status: 'error',
                    error: { type: 'prove', message: (err as Error).message },
                });
            }
        }
        console.info('  Done: ' + label);
    }

    await logger.close();
    console.info('\nCompleted: ' + total_ok + ' ok, ' + total_err + ' errors');
    console.info('Output: ' + output_path);
    process.exit(0);
}

if (require.main === module) {
    runExp1().catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
    });
}

export { runExp1 };
