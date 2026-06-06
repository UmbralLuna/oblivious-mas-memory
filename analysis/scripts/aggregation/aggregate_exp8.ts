// analysis/scripts/aggregation/aggregate_exp8.ts
import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp8Record {
    sub_exp: string;
    metrics: {
        blocked: number;
    };
}

async function aggregateExp8(): Promise<void> {
    console.log('=== Aggregating Exp8 (Adaptive Attacks) ===');
    
    const dir = 'analysis/results/exp8_adaptive';
    const files = await fs.readdir(dir);
    const content = await fs.readFile(join(dir, files[0]), 'utf-8');
    const records: Exp8Record[] = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    console.log(`Loaded ${records.length} records`);
    
    const attacks = ['white_box_circuit', 'scope_fuzzing', 'rl_collusion'];
    const aggregated = attacks.map(attack => {
        const filtered = records.filter(r => r.sub_exp === attack);
        const blocked = filtered.filter(r => r.metrics.blocked === 1).length;
        return {
            attack,
            count: filtered.length,
            block_rate: blocked / filtered.length,
        };
    });
    
    const output_path = 'analysis/outputs/aggregated/exp8_aggregated.json';
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
    for (const agg of aggregated) {
        console.log(`  ${agg.attack}: block_rate=${(agg.block_rate * 100).toFixed(1)}%`);
    }
}

aggregateExp8().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
