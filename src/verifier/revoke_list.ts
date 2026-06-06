// src/verifier/revoke_list.ts
// 撤销列表（Counting Bloom Filter）
// 规范 v4.0 §5.3

import { createHash } from 'crypto';

/**
 * Counting Bloom Filter（撤销列表）
 */
export class RevokeList {
    private counters: Uint8Array;
    private k: number; // 哈希函数数量
    private m: number; // 位数组大小

    /**
     * @param m 位数组大小（建议 10^5 规模用 m=1,000,000）
     * @param k 哈希函数数量（建议 k=7）
     */
    constructor(m: number = 1_000_000, k: number = 7) {
        this.m = m;
        this.k = k;
        this.counters = new Uint8Array(m);
    }

    /**
     * 计算 k 个哈希位置
     */
    private hash(item: string): number[] {
        const positions: number[] = [];
        for (let i = 0; i < this.k; i++) {
            const h = createHash('sha256').update(`${item}::${i}`).digest();
            const pos = Number(BigInt('0x' + h.toString('hex').slice(0, 8)) % BigInt(this.m));
            positions.push(pos);
        }
        return positions;
    }

    /**
     * 添加撤销的 nullifier
     */
    add(nf: string): void {
        const positions = this.hash(nf);
        for (const pos of positions) {
            if (this.counters[pos] < 255) {
                this.counters[pos]++;
            }
        }
    }

    /**
     * 检查 nullifier 是否被撤销
     */
    has(nf: string): boolean {
        const positions = this.hash(nf);
        for (const pos of positions) {
            if (this.counters[pos] === 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * 移除撤销（用于测试）
     */
    remove(nf: string): void {
        const positions = this.hash(nf);
        for (const pos of positions) {
            if (this.counters[pos] > 0) {
                this.counters[pos]--;
            }
        }
    }

    /**
     * 估算误报率
     */
    estimateFalsePositiveRate(): number {
        const n = this.counters.filter((c) => c > 0).length;
        // FPR ≈ (1 - e^(-kn/m))^k
        const ratio = (this.k * n) / this.m;
        return Math.pow(1 - Math.exp(-ratio), this.k);
    }

    /**
     * 清空
     */
    clear(): void {
        this.counters.fill(0);
    }
}
