// analysis/scripts/aggregation/aggregate_exp3.ts
import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp3Record {
    baseline: string;
    metrics: {
                is_attack: number;
        success: number;
        duration_ms: number;
        access_grants: number;
        access_denies: number;
    };
}

async function aggregateExp3(): Promise<void> {
    console.log('=== Aggregating Exp3 (E2E Latency) ===');
    
    const dir = 'analysis/results/exp3_e2e';
    const files = await fs.readdir(dir);
    const jsonl_files = files.filter(f => f.endsWith('.jsonl'));
    
    let all_records: Exp3Record[] = [];
    for (const file of jsonl_files) {
        const content = await fs.readFile(join(dir, file), 'utf-8');
        const records = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
        all_records = all_records.concat(records);
    }
    
    console.log(`Loaded ${all_records.length} records`);
    
    const baselines = ['ours', 'no_ac', 'rbac', 'abac', 'collab_memory', 'aip'];
    const aggregated = baselines.map(baseline => {
        const filtered = all_records.filter(r => r.baseline === baseline);
        const normal_tasks = filtered.filter(r => r.metrics.is_attack === 0);
        const successes = normal_tasks.filter(r => r.metrics.success === 1).length;
        const durations = filtered.map(r => r.metrics.duration_ms).filter(d => d > 0);
        durations.sort((a, b) => a - b);
        
        return {
            baseline,
            count: filtered.length,
            success_rate: successes / normal_tasks.length,
            duration_p50: durations[Math.floor(durations.length * 0.5)] || 0,
            duration_p95: durations[Math.floor(durations.length * 0.95)] || 0,
            duration_mean: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
        };
    });
    
    const output_path = 'analysis/outputs/aggregated/exp3_aggregated.json';
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
    for (const agg of aggregated) {
        console.log(`  ${agg.baseline}: success=${(agg.success_rate * 100).toFixed(1)}%, p50=${agg.duration_p50}ms`);
    }
}

aggregateExp3().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
