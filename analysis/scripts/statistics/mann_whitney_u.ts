// analysis/scripts/statistics/mann_whitney_u.ts
// Mann-Whitney U test (non-parametric)

/**
 * Rank data (handle ties with average rank)
 */
function rankData(data: number[]): number[] {
    const sorted = data.map((val, idx) => ({ val, idx }))
        .sort((a, b) => a.val - b.val);
    
    const ranks = new Array(data.length);
    let i = 0;
    
    while (i < sorted.length) {
        let j = i;
        // Find ties
        while (j < sorted.length && sorted[j].val === sorted[i].val) {
            j++;
        }
        
        // Average rank for ties
        const avg_rank = (i + j + 1) / 2;
        for (let k = i; k < j; k++) {
            ranks[sorted[k].idx] = avg_rank;
        }
        
        i = j;
    }
    
    return ranks;
}

/**
 * Mann-Whitney U test
 * 
 * @param x First sample
 * @param y Second sample
 * @returns U statistic and p-value (two-tailed)
 */
export function mannWhitneyU(x: number[], y: number[]): {
    U: number;
    p_value: number;
    effect_size: number;
} {
    const n1 = x.length;
    const n2 = y.length;
    
    // Combine and rank
    const combined = [...x, ...y];
    const ranks = rankData(combined);
    
    // Sum ranks for group 1
    const R1 = ranks.slice(0, n1).reduce((a, b) => a + b, 0);
    
    // Calculate U
    const U1 = R1 - (n1 * (n1 + 1)) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);
    
    // Calculate z-score (normal approximation)
    const mean_U = (n1 * n2) / 2;
    const std_U = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (U - mean_U) / std_U;
    
    // Two-tailed p-value (standard normal)
    const p_value = 2 * (1 - normalCDF(Math.abs(z)));
    
    // Effect size (rank-biserial correlation)
    const effect_size = 1 - (2 * U) / (n1 * n2);
    
    return { U, p_value, effect_size };
}

/**
 * Standard normal CDF (approximation)
 */
function normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
}

/**
 * Example usage
 */
if (require.main === module) {
    const ours = [0.95, 0.94, 0.96, 0.93, 0.97, 0.95, 0.94, 0.96];
    const aip = [0.88, 0.87, 0.89, 0.86, 0.90, 0.88, 0.87, 0.89];
    
    const result = mannWhitneyU(ours, aip);
    console.log('Mann-Whitney U test:');
    console.log(`  U = ${result.U}`);
    console.log(`  p-value = ${result.p_value.toFixed(4)}`);
    console.log(`  Effect size = ${result.effect_size.toFixed(3)}`);
    
    if (result.p_value < 0.05) {
        console.log('  ✓ Significant difference (p < 0.05)');
    } else {
        console.log('  ✗ No significant difference');
    }
}
