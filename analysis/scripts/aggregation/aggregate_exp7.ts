// analysis/scripts/aggregation/aggregate_exp7.ts
import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp7Record {
    variant: string;
    metrics: {
        prove_ms: number;
        verify_ms: number;
        circuit_valid: number;
    };
}

async function aggregateExp7(): Promise<void> {
    console.log('=== Aggregating Exp7 (Ablation) ===');
    
    const dir = 'analysis/results/exp7_ablation';
    const files = await fs.readdir(dir);
    
    let all_records: Exp7Record[] = [];
    for (const file of files) {
        const content = await fs.readFile(join(dir, file), 'utf-8');
        const records = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
        all_records = all_records.concat(records);
    }
    
    console.log(`Loaded ${all_records.length} records`);
    
    const variants = ['no_g4', 'no_g43', 'no_g5', 'no_g61', 'plaintext_id', 'no_session_token'];
    const aggregated = variants.map(variant => {
        const filtered = all_records.filter(r => r.variant === variant);
        const prove_times = filtered.map(r => r.metrics.prove_ms).sort((a, b) => a - b);
        const verify_times = filtered.map(r => r.metrics.verify_ms).sort((a, b) => a - b);
        
        return {
            variant,
            count: filtered.length,
            prove_p50: prove_times[Math.floor(prove_times.length * 0.5)] || 0,
            verify_p50: verify_times[Math.floor(verify_times.length * 0.5)] || 0,
            prove_mean: prove_times.reduce((a, b) => a + b, 0) / prove_times.length || 0,
            verify_mean: verify_times.reduce((a, b) => a + b, 0) / verify_times.length || 0,
        };
    });
    
    const output_path = 'analysis/outputs/aggregated/exp7_aggregated.json';
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
    for (const agg of aggregated) {
        console.log(`  ${agg.variant}: prove=${agg.prove_p50.toFixed(0)}ms, verify=${agg.verify_p50.toFixed(1)}ms`);
    }
}

aggregateExp7().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
