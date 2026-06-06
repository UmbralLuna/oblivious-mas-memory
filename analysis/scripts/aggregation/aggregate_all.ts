// analysis/scripts/aggregation/aggregate_all.ts
import { promises as fs } from 'fs';

async function aggregateAll(): Promise<void> {
    console.log('=== Aggregating All Experiments ===');
    
    const experiments = ['exp1', 'exp3', 'exp4', 'exp5', 'exp6', 'exp7', 'exp8'];
    const summary: Record<string, any> = {};
    
    for (const exp of experiments) {
        const path = `analysis/outputs/aggregated/${exp}_aggregated.json`;
        if (await fs.access(path).then(() => true).catch(() => false)) {
            const content = await fs.readFile(path, 'utf-8');
            summary[exp] = JSON.parse(content);
            console.log(`  ✓ Loaded ${exp}`);
        } else {
            console.log(`  ⚠ Missing ${exp}`);
        }
    }
    
    const output_path = 'analysis/outputs/aggregated/all_experiments.json';
    await fs.writeFile(output_path, JSON.stringify(summary, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
}

aggregateAll().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
