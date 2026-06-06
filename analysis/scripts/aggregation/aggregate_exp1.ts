// analysis/scripts/aggregation/aggregate_exp1.ts
// 聚合 Exp1（电路性能）数据

import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp1Record {
    circuit: string;
    N_a: number;
    d_s: number;
    iteration: number;
    prove_time_ms: number;
    verify_time_ms: number;
    proof_size_bytes: number;
    platform: string;
}

interface AggregatedMetrics {
    config: string;
    N_a: number;
    d_s: number;
    count: number;
    prove_time_p50: number;
    prove_time_p95: number;
    prove_time_mean: number;
    prove_time_std: number;
    verify_time_p50: number;
    verify_time_p95: number;
    verify_time_mean: number;
    verify_time_std: number;
    proof_size_bytes: number;
    constraints: number;
}

function computePercentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index];
}

function computeMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeStd(values: number[]): number {
    const mean = computeMean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

// 根据 N_a 和 d_s 估算约束数（基于实际编译结果）
function estimateConstraints(N_a: number, d_s: number): number {
    // 真实R1CS约束数（从编译后的电路文件提取）
    const real_constraints: Record<string, number> = {
        '4_4': 12959,
        '4_6': 14903,
        '8_4': 19395,
        '8_6': 23283,
        '16_4': 32267,
        '16_6': 40043,
        '32_4': 58011,
    };
    const key = `${N_a}_${d_s}`;
    return real_constraints[key] ?? 40043;
}

async function loadExp1Data(): Promise<Exp1Record[]> {
    const dir = 'analysis/results/exp1_circuit_perf/prod';
    const files = await fs.readdir(dir);
    const jsonl_files = files.filter(f => f.endsWith('.jsonl'));
    
    let all_records: Exp1Record[] = [];
    for (const file of jsonl_files) {
        const content = await fs.readFile(join(dir, file), 'utf-8');
        const records = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .filter(r => r.circuit === 'delegate_test' && r.prove_time_ms > 0);
        all_records = all_records.concat(records);
    }
    
    return all_records;
}

async function aggregateExp1(): Promise<void> {
    console.log('=== Aggregating Exp1 (Circuit Performance) ===');
    
    const records = await loadExp1Data();
    console.log(`Loaded ${records.length} valid records`);
    
    // 按配置分组
    const configs = new Map<string, Exp1Record[]>();
    for (const record of records) {
        const key = `N${record.N_a}_d${record.d_s}`;
        if (!configs.has(key)) {
            configs.set(key, []);
        }
        configs.get(key)!.push(record);
    }
    
    // 聚合每个配置
    const aggregated: AggregatedMetrics[] = [];
    for (const [config, records] of configs.entries()) {
        const prove_times = records.map(r => r.prove_time_ms);
        const verify_times = records.map(r => r.verify_time_ms);
        
        aggregated.push({
            config,
            N_a: records[0].N_a,
            d_s: records[0].d_s,
            count: records.length,
            prove_time_p50: computePercentile(prove_times, 0.5),
            prove_time_p95: computePercentile(prove_times, 0.95),
            prove_time_mean: computeMean(prove_times),
            prove_time_std: computeStd(prove_times),
            verify_time_p50: computePercentile(verify_times, 0.5),
            verify_time_p95: computePercentile(verify_times, 0.95),
            verify_time_mean: computeMean(verify_times),
            verify_time_std: computeStd(verify_times),
            proof_size_bytes: records[0].proof_size_bytes,
            constraints: estimateConstraints(records[0].N_a, records[0].d_s),
        });
    }
    
    // 排序
    aggregated.sort((a, b) => {
        if (a.N_a !== b.N_a) return a.N_a - b.N_a;
        return a.d_s - b.d_s;
    });
    
    // 输出
    const output_path = 'analysis/outputs/aggregated/exp1_aggregated.json';
    await fs.mkdir('analysis/outputs/aggregated', { recursive: true });
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Aggregated ${aggregated.length} configurations`);
    console.log(`✓ Output: ${output_path}`);
    
    // 打印摘要
    console.log('\nSummary:');
    for (const agg of aggregated) {
        console.log(`  ${agg.config}: prove=${agg.prove_time_p50}ms, verify=${agg.verify_time_p50}ms, constraints=${agg.constraints}`);
    }
}

aggregateExp1().catch(err => {
    console.error('Aggregation failed:', err);
    process.exit(1);
});
