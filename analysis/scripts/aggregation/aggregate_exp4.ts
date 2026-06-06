// analysis/scripts/aggregation/aggregate_exp4.ts
import { promises as fs } from 'fs';
import { join } from 'path';

interface Exp4Record {
    defense: string;
    attack_type: string;
    metrics: {
        blocked: number;
        detected: number;
    };
}

async function aggregateExp4(): Promise<void> {
    console.log('=== Aggregating Exp4 (Defense Effectiveness) ===');
    
    const dir = 'analysis/results/exp4_defense';
    const files = await fs.readdir(dir);
    
    let all_records: Exp4Record[] = [];
    for (const file of files) {
        const content = await fs.readFile(join(dir, file), 'utf-8');
        const records = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
        all_records = all_records.concat(records);
    }
    
    console.log(`Loaded ${all_records.length} records`);
    
    const defenses = ['mwpp_only', 'content_only', 'combined'];
    const attacks = ['A_unauthorized', 'B_obvious', 'C_adversarial', 'D_collusion'];
    
    const aggregated = defenses.map(defense => {
        const defense_records = all_records.filter(r => r.defense === defense);
        const by_attack = attacks.map(attack => {
            const attack_records = defense_records.filter(r => r.attack_type === attack);
            const blocked = attack_records.filter(r => r.metrics.blocked === 1).length;
            const detected = attack_records.filter(r => r.metrics.detected === 1).length;
            return {
                attack,
                block_rate: attack_records.length > 0 ? blocked / attack_records.length : 0,
                detect_rate: attack_records.length > 0 ? detected / attack_records.length : 0,
                count: attack_records.length,
            };
        });
        
        return { defense, attacks: by_attack };
    });
    
    const output_path = 'analysis/outputs/aggregated/exp4_aggregated.json';
    await fs.writeFile(output_path, JSON.stringify(aggregated, null, 2));
    
    console.log(`✓ Output: ${output_path}`);
    for (const agg of aggregated) {
        const avg_block = agg.attacks.reduce((sum, a) => sum + a.block_rate, 0) / agg.attacks.length;
        console.log(`  ${agg.defense}: avg_block=${(avg_block * 100).toFixed(1)}%`);
    }
}

aggregateExp4().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
