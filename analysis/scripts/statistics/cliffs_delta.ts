// analysis/scripts/statistics/cliffs_delta.ts
// Cliff's Delta effect size

/**
 * Cliff's Delta effect size
 * 
 * Measures how often values in one distribution are larger than values in another.
 * 
 * @param x First sample
 * @param y Second sample
 * @returns Delta value in [-1, 1]
 *   - delta > 0: x tends to be larger than y
 *   - delta < 0: y tends to be larger than x
 *   - |delta| < 0.147: negligible
 *   - 0.147 <= |delta| < 0.33: small
 *   - 0.33 <= |delta| < 0.474: medium
 *   - |delta| >= 0.474: large
 */
export function cliffsDelta(x: number[], y: number[]): number {
    let more = 0;
    let less = 0;
    
    for (const xi of x) {
        for (const yi of y) {
            if (xi > yi) more++;
            else if (xi < yi) less++;
        }
    }
    
    return (more - less) / (x.length * y.length);
}

/**
 * Interpret effect size
 */
export function interpretDelta(delta: number): string {
    const abs_delta = Math.abs(delta);
    
    if (abs_delta < 0.147) return 'negligible';
    if (abs_delta < 0.33) return 'small';
    if (abs_delta < 0.474) return 'medium';
    return 'large';
}

/**
 * Example usage
 */
if (require.main === module) {
    const ours = [0.95, 0.94, 0.96, 0.93, 0.97];
    const aip = [0.88, 0.87, 0.89, 0.86, 0.90];
    
    const delta = cliffsDelta(ours, aip);
    const interpretation = interpretDelta(delta);
    
    console.log(`Cliff's Delta: ${delta.toFixed(3)} (${interpretation})`);
}
