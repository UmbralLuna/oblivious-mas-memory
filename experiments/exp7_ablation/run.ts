// experiments/exp7_ablation/run.ts
// 实验 7：消融 - 真实消融电路编译 + 运行
// 规范 v4.0 §8.7

import { join } from 'path';
import { promises as fs } from 'fs';
import { existsSync, statSync } from 'fs';
import { collectMachineInfo } from '../../src/utils/machine_info';
import { JSONLLogger } from '../../src/utils/jsonl_logger';
import { HighResTimer } from '../../src/utils/timer';

interface Exp7Config {
    exp_id: string;
    variants: Record<string, { platform: string; metric: string }>;
    tasks_per_variant: number;
    output_dir: string;
}

async function runVariantIteration(
    variant: string,
    iteration: number
): Promise<Record<string, number>> {
    const wasm_path = `circuits/build/ablation/${variant}/${variant}_js/${variant}.wasm`;
    const zkey_path = `artifacts/keys/${variant}.zkey`;
    const vkey_path = `artifacts/keys/${variant}_vkey.json`;

    for (const p of [wasm_path, zkey_path, vkey_path]) {
        if (!existsSync(p)) {
            throw new Error(`Missing ${p}. Compile ablation circuits first.`);
        }
    }

    // 使用基础 fixture
    const fixture_path = `circuits/tests/fixtures/${variant}_fixture.json`;
    if (!existsSync(fixture_path)) {
        throw new Error(`Missing fixture: ${fixture_path}`);
    }

    const witness_input = JSON.parse(await fs.readFile(fixture_path, 'utf-8'));
    const { groth16 } = await import('snarkjs');

    const timer = new HighResTimer();
    timer.start();
    const { proof, publicSignals } = await groth16.fullProve(witness_input, wasm_path, zkey_path);
    const prove_ms = Number(timer.stop()) / 1e6;

    const vKey = JSON.parse(await fs.readFile(vkey_path, 'utf-8'));
    const verify_timer = new HighResTimer();
    verify_timer.start();
    const valid = await groth16.verify(vKey, publicSignals, proof);
    const verify_ms = Number(verify_timer.stop()) / 1e6;

    // 测量关键退化指标（基于变体类型）
    // 注：真实退化需要运行完整 Exp3 子集 + 推断攻击
    // 这里测量基础电路指标，论文中配合 Exp3 子集数据解释
    return {
        variant_id: iteration,
        prove_ms,
        verify_ms,
        proof_size_bytes: Buffer.byteLength(JSON.stringify(proof), 'utf-8'),
        circuit_valid: valid ? 1 : 0,
        zkey_size_mb: statSync(zkey_path).size / (1024 * 1024),
    };
}

async function runExp7(): Promise<void> {
    console.info('=== Exp7: Ablation - REAL circuits ===');

    const config_path = join(__dirname, 'config.json');
    const config: Exp7Config = JSON.parse(await fs.readFile(config_path, 'utf-8'));

    const machine = collectMachineInfo();
    const output_path = join(config.output_dir, `exp7_${Date.now()}.jsonl`);
    const logger = new JSONLLogger(output_path);

    // 检查所有消融电路
    const ablation_variants = Object.keys(config.variants);
    const compiled = ablation_variants.filter((v) =>
        existsSync(`circuits/build/ablation/${v}/${v}.r1cs`)
    );

    console.info(`Compiled ablation circuits: ${compiled.length}/${ablation_variants.length}`);
    if (compiled.length === 0) {
        throw new Error(
            'No ablation circuits compiled. Run bash scripts/build/compile_circuits.sh'
        );
    }

    for (const [variant, info] of Object.entries(config.variants)) {
        if (!compiled.includes(variant)) {
            console.warn(`Skipping ${variant} (not compiled)`);
            await logger.log({
                schema_version: '1.0.0',
                exp_id: config.exp_id,
                sub_exp: variant,
                platform: info.platform,
                machine,
                timestamp_iso: new Date().toISOString(),
                status: 'skipped',
                error: { type: 'not_compiled', message: 'ablation circuit not found' },
            });
            continue;
        }

        console.info(`Variant: ${variant} (${info.platform})`);

        for (let i = 0; i < config.tasks_per_variant; i++) {
            try {
                const metrics = await runVariantIteration(variant, i);

                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: config.exp_id,
                    sub_exp: variant,
                    platform: info.platform,
                    variant,
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    metrics,
                    status: 'ok',
                });
            } catch (err) {
                await logger.log({
                    schema_version: '1.0.0',
                    exp_id: config.exp_id,
                    sub_exp: variant,
                    platform: info.platform,
                    iteration: i,
                    machine,
                    timestamp_iso: new Date().toISOString(),
                    status: 'error',
                    error: { type: 'iteration_failed', message: (err as Error).message },
                });
            }
        }
    }

    console.info(`\n✓ Output: ${output_path}`);
    process.exit(0);
}

if (require.main === module) {
    runExp7().then(() => process.exit(0)).catch((err) => {
        console.error('Experiment failed:', err);
        process.exit(1);
    });
    
}

export { runExp7 };

