// analysis/scripts/statistics/bootstrap_ci.ts
// Bootstrap 95% confidence interval

/**
 * Bootstrap resample
 */
function resample(data: number[], rng: () => number): number[] {
    const n = data.length;
    const sample: number[] = [];
    for (let i = 0; i < n; i++) {
        const idx = Math.floor(rng() * n);
        sample.push(data[idx]);
    }
    return sample;
}

/**
 * Calculate mean
 */
function mean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Calculate median
 */
function median(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/**
 * Bootstrap confidence interval
 * 
 * @param data Sample data
 * @param alpha Significance level (default 0.05 for 95% CI)
 * @param n_bootstrap Number of bootstrap samples (default 10000)
 * @param statistic Statistic function (default: mean)
 * @param seed Random seed
 */
export function bootstrapCI(
    data: number[],
    alpha: number = 0.05,
    n_bootstrap: number = 10000,
    statistic: (d: number[]) => number = mean,
    seed: number = 42
): { lower: number; upper: number; point_estimate: number } {
    
    // Seeded RNG
    let state = seed;
    const rng = () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };

    // Bootstrap samples
    const bootstrap_stats: number[] = [];
    for (let i = 0; i < n_bootstrap; i++) {
        const sample = resample(data, rng);
        bootstrap_stats.push(statistic(sample));
    }

    // Sort and get percentiles
    bootstrap_stats.sort((a, b) => a - b);
    const lower_idx = Math.floor(n_bootstrap * (alpha / 2));
    const upper_idx = Math.floor(n_bootstrap * (1 - alpha / 2));

    return {
        lower: bootstrap_stats[lower_idx],
        upper: bootstrap_stats[upper_idx],
        point_estimate: statistic(data),
    };
}

/**
 * Example usage
 */
if (require.main === module) {
    const data = [2.3, 2.5, 2.7, 2.4, 2.6, 2.8, 2.5, 2.4, 2.6, 2.7];
    
    const ci_mean = bootstrapCI(data, 0.05, 10000, mean);
    console.log('Mean 95% CI:', ci_mean);
    
    const ci_median = bootstrapCI(data, 0.05, 10000, median);
    console.log('Median 95% CI:', ci_median);
}
