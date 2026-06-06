// src/utils/timer.ts

/**
 * 高精度计时器（基于 process.hrtime.bigint）
 * 用于性能基准测试
 */
export class HighResTimer {
    private startNs = 0n;
    private endNs = 0n;

    /** 开始计时 */
    start(): void {
        this.startNs = process.hrtime.bigint();
    }

    /** 停止计时并返回纳秒数 */
    stop(): bigint {
        this.endNs = process.hrtime.bigint();
        return this.endNs - this.startNs;
    }

    /** 返回经过的纳秒数 */
    elapsedNs(): bigint {
        return this.endNs - this.startNs;
    }

    /** 返回经过的毫秒数 */
    elapsedMs(): number {
        return Number(this.endNs - this.startNs) / 1e6;
    }

    /** 返回经过的微秒数 */
    elapsedUs(): number {
        return Number(this.endNs - this.startNs) / 1e3;
    }
}

/**
 * Benchmark 选项
 */
export interface BenchmarkOptions {
    /** Warmup 次数 */
    warmup: number;
    /** 实际迭代次数 */
    iterations: number;
    /** 是否在每次迭代之间触发 GC */
    gcBetween?: boolean;
    /** 进度回调 */
    onProgress?: (current: number, total: number) => void;
}

/**
 * Benchmark 结果
 */
export interface BenchmarkResult<T> {
    name: string;
    samples_ns: bigint[];
    samples_ms: number[];
    results: T[];

    /** 统计信息 */
    stats: {
        min_ms: number;
        max_ms: number;
        mean_ms: number;
        median_ms: number;
        p90_ms: number;
        p99_ms: number;
        std_ms: number;
    };
}

/**
 * 运行 benchmark
 */
export async function benchmark<T>(
    name: string,
    f: () => Promise<T>,
    opts: BenchmarkOptions
): Promise<BenchmarkResult<T>> {
    const samples: bigint[] = [];
    const results: T[] = [];

    // Warmup
    for (let i = 0; i < opts.warmup; i++) {
        await f();
    }

    // Actual benchmark
    for (let i = 0; i < opts.iterations; i++) {
        if (opts.gcBetween && global.gc) {
            global.gc();
        }

        const t = new HighResTimer();
        t.start();
        const r = await f();
        samples.push(t.stop());
        results.push(r);

        if (opts.onProgress) {
            opts.onProgress(i + 1, opts.iterations);
        }
    }

    const samples_ms = samples.map((ns) => Number(ns) / 1e6);
    const sorted = [...samples_ms].sort((a, b) => a - b);

    const mean = samples_ms.reduce((a, b) => a + b, 0) / samples_ms.length;
    const variance = samples_ms.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples_ms.length;

    return {
        name,
        samples_ns: samples,
        samples_ms,
        results,
        stats: {
            min_ms: sorted[0],
            max_ms: sorted[sorted.length - 1],
            mean_ms: mean,
            median_ms: sorted[Math.floor(sorted.length / 2)],
            p90_ms: sorted[Math.floor(sorted.length * 0.9)],
            p99_ms: sorted[Math.floor(sorted.length * 0.99)],
            std_ms: Math.sqrt(variance),
        },
    };
}
