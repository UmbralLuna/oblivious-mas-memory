// analysis/scripts/aggregation/aggregate_exp6.ts
import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp6Record {
    metrics: {
        n_agents: number;
        duration_ms: number;
    };
}

async function aggregateExp6(): Promise<void> {
    console.log('=== Aggregating Exp6 (Scalability) ===');
    
    const dir = 'analysis/results/exp6_scalability';
    const files = await fs.readdir(dir);
    const content = await fs.readFile(join(dir, files[0]), 'utf-8');
    const records: Exp6Record[] = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    console.log(`Loaded ${records.length} records`);
    
    const aggregated = [10, 50, 100].map(n => {
        const filtered = records.filter(r => r.metrics.n_agents === n);
        const durations = filtered.map(r => r.metrics.duration_ms);
        
        return {
            n_agents: n,
            count: filtered.length,
            duration_mean: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
            duration_min: durations.length > 0 ? Math.min(...durations) : 0,
            duration_max: durations.length > 0 ? Math.max(...durations) : 0,
            // 估算吞吐量：n_agents / (duration_ms / 1000)
            throughput_tps: durations.length > 0 ? n / (durations.reduce((a, b) => a + b, 0) / durations.length / 1000) : 0,
        };
    });
    
    const output_path = 'analysis/outputs/aggregated/exp6_aggregated.json';
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
    for (const agg of aggregated) {
        console.log(`  n=${agg.n_agents}: duration=${agg.duration_mean.toFixed(1)}ms, throughput=${agg.throughput_tps.toFixed(1)} tps`);
    }
}

aggregateExp6().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
