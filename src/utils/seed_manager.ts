// src/utils/seed_manager.ts

import seedrandom from 'seedrandom';

/**
 * 种子管理器（确保实验可复现）
 * 每个 purpose 派生独立的 RNG，避免状态串扰
 */
export class SeedManager {
    private readonly subRngs = new Map<string, seedrandom.PRNG>();

    constructor(public readonly masterSeed: number) {
        if (!Number.isInteger(masterSeed) || masterSeed < 0) {
            throw new Error('masterSeed must be non-negative integer');
        }
    }

    /**
     * 获取指定用途的 RNG
     */
    getRng(purpose: string): seedrandom.PRNG {
        const key = `${this.masterSeed}::${purpose}`;
        let rng = this.subRngs.get(key);
        if (!rng) {
            rng = seedrandom(key);
            this.subRngs.set(key, rng);
        }
        return rng;
    }

    /**
     * 生成随机整数 [min, max)
     */
    randomInt(purpose: string, min: number, max: number): number {
        const rng = this.getRng(purpose);
        return Math.floor(rng() * (max - min)) + min;
    }

    /**
     * 生成随机浮点数 [0, 1)
     */
    random(purpose: string): number {
        return this.getRng(purpose)();
    }

    /**
     * 从数组中随机选择
     */
    choice<T>(purpose: string, arr: T[]): T {
        const idx = this.randomInt(purpose, 0, arr.length);
        return arr[idx];
    }

    /**
     * 序列化（用于实验记录）
     */
    serialize(): { masterSeed: number; purposes: string[] } {
        return {
            masterSeed: this.masterSeed,
            purposes: Array.from(this.subRngs.keys()).sort(),
        };
    }
}

/**
 * 全局默认种子管理器
 */
let globalSeedManager: SeedManager | null = null;

export function setGlobalSeed(seed: number): void {
    globalSeedManager = new SeedManager(seed);
}

export function getGlobalSeedManager(): SeedManager {
    if (!globalSeedManager) {
        globalSeedManager = new SeedManager(42);
    }
    return globalSeedManager;
}
