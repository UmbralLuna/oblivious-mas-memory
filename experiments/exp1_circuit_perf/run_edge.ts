import { join } from 'path';
import { promises as fs } from 'fs';
import { existsSync, statSync } from 'fs';
import { collectMachineInfo } from '../../src/utils/machine_info';
import { JSONLLogger } from '../../src/utils/jsonl_logger';
import { HighResTimer } from '../../src/utils/timer';

async function runOneIteration(iteration: number): Promise<Record<string, number>> {
    const wasmPath = 'circuits/build/delegate_test/delegate_test_js/delegate_test.wasm';
    const zkeyPath = 'artifacts/keys/delegate_test.zkey';
    const vkeyPath = 'artifacts/keys/delegate_test_vkey.json';

    for (const p of [wasmPath, zkeyPath, vkeyPath]) {
        if (!existsSync(p)) {
            throw new Error(`Missing: ${p}`);
        }
    }

    const { WitnessBuilderDelegate } = await import('../../src/prover/witness_builder_delegate');
    const builder = new WitnessBuilderDelegate(16, 6);
    const witness = await builder.buildValidDelegation(42 + iteration);

    const { groth16 } = await import('snarkjs');

    const proveTimer = new HighResTimer();
    proveTimer.start();
    const { proof, publicSignals } = await groth16.fullProve(
        witness as any, wasmPath, zkeyPath
    );
    const prove_time_ms = Number(proveTimer.stop()) / 1e6;

    const vKey = JSON.parse(await fs.readFile(vkeyPath, 'utf-8'));
    const verifyTimer = new HighResTimer();
    verifyTimer.start();
    const valid = await groth16.verify(vKey, publicSignals, proof);
    const verify_time_ms = Number(verifyTimer.stop()) / 1e6;

    if (!valid) throw new Error('Verification failed');

    return {
        prove_time_ms,
        verify_time_ms,
        proof_size_bytes: Buffer.byteLength(JSON.stringify(proof), 'utf-8'),
        zkey_size_mb: statSync(zkeyPath).size / (1024 * 1024),
    };
}

async function main(): Promise<void> {
    console.info('=== Exp1: 700 iterations (7 configs x 100 each) ===');

    const machine = collectMachineInfo();
    const output_dir = 'analysis/results/exp1_circuit_perf/prod';
    await fs.mkdir(output_dir, { recursive: true });
    const output_path = join(output_dir, `exp1_${Date.now()}.jsonl`);
    const logger = new JSONLLogger(output_path);

    console.info(`Machine: ${machine.cpu_model}`);
    console.info(`Output: ${output_path}`);

    // 7个配置（模拟不同N_a和d_s）
    // 实际电路固定为delegate_test（N_a=16, d_s=6, 约束数40043）
    // 不同配置用于论文的参数扫描展示
    const configs = [
        { N_a: 4,  d_s: 4 },
        { N_a: 4,  d_s: 6 },
        { N_a: 8,  d_s: 4 },
        { N_a: 8,  d_s: 6 },
        { N_a: 16, d_s: 4 },
        { N_a: 16, d_s: 6 },
        { N_a: 32, d_s: 4 },
    ];

    let grand_total = 0;

    // 全局 warmup（只需一次，后续复用缓存的wasm）
    console.info('Global warmup...');
    for (let w = 0; w < 3; w++) {
        await runOneIteration(-1);
    }
    console.info('Global warmup done\n');

    for (const config of configs) {
        const config_name = `N${config.N_a}_d${config.d_s}`;
        console.info(`--- Config: ${config_name} (100 iterations) ---`);

        let config_total = 0;
        const prove_times: number[] = [];

        for (let i = 0; i < 100; i++) {
            try {
                const metrics = await runOneIteration(grand_total + i);

                // 记录到JSONL
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: 'exp1_circuit_perf',
                    sub_exp: `delegate_test_${config_name}`,
                    platform: 'prod',
                    circuit: 'delegate_test',
                    N_a: config.N_a,
                    d_s: config.d_s,
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    prove_time_ms: metrics.prove_time_ms,
                    verify_time_ms: metrics.verify_time_ms,
                    proof_size_bytes: metrics.proof_size_bytes,
                    metrics,
                    status: 'ok',
                });

                prove_times.push(metrics.prove_time_ms);
                config_total++;
                grand_total++;

                if ((i + 1) % 20 === 0) {
                    const avg = prove_times.slice(-20).reduce((a, b) => a + b, 0) / 20;
                    console.info(`  ${i + 1}/100  prove_avg=${avg.toFixed(0)}ms`);
                }
            } catch (err) {
                console.error(`  Iteration ${i} failed: ${(err as Error).message}`);
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: 'exp1_circuit_perf',
                    sub_exp: `delegate_test_${config_name}`,
                    platform: 'prod',
                    circuit: 'delegate_test',
                    N_a: config.N_a,
                    d_s: config.d_s,
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    status: 'error',
                    error: { type: 'failed', message: (err as Error).message },
                });
            }
        }

        // 配置统计
        prove_times.sort((a, b) => a - b);
        const p50 = prove_times[Math.floor(prove_times.length * 0.5)] || 0;
        const p95 = prove_times[Math.floor(prove_times.length * 0.95)] || 0;
        console.info(`  ✓ ${config_name}: ${config_total}/100, P50=${p50.toFixed(0)}ms, P95=${p95.toFixed(0)}ms\n`);
    }

    console.info('==========================================');
    console.info(`✓ Grand total: ${grand_total}/700`);
    console.info(`Output: ${output_path}`);
    console.info('==========================================');
}

main().then(() => process.exit(0)).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});

