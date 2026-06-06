// src/utils/llm_cache.ts

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

/**
 * LLM 请求
 */
export interface LLMRequest {
    model: string;
    messages: unknown[];
    temperature: number;
    seed: number;
    [key: string]: unknown;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
    content: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens?: number;
    };
}

/**
 * 缓存条目
 */
export interface CacheEntry {
    request: LLMRequest;
    response: LLMResponse;
    timestamp: string;
    cache_version: string;
}

/**
 * LLM 缓存（用于实验可复现性）
 * 论文规范 v4.0 §3.4
 */
export class LLMCache {
    private hits = 0;
    private misses = 0;

    constructor(
        private cacheDir: string,
        private version: string = 'v1.0.0'
    ) {}

    /**
     * 计算请求哈希（作为缓存键）
     */
    private hashRequest(req: LLMRequest): string {
        const canonical = JSON.stringify(req, Object.keys(req).sort());
        return createHash('sha256').update(canonical).digest('hex');
    }

    /**
     * 获取缓存
     */
    async get(req: LLMRequest): Promise<CacheEntry | null> {
        const hash = this.hashRequest(req);
        const filepath = path.join(this.cacheDir, `${hash}.json`);

        if (!existsSync(filepath)) {
            this.misses++;
            return null;
        }

        try {
            const content = await fs.readFile(filepath, 'utf-8');
            const cached: CacheEntry = JSON.parse(content);

            // 版本检查
            if (cached.cache_version !== this.version) {
                this.misses++;
                return null;
            }

            this.hits++;
            return cached;
        } catch {
            this.misses++;
            return null;
        }
    }

    /**
     * 写入缓存
     */
    async set(req: LLMRequest, resp: LLMResponse): Promise<void> {
        const hash = this.hashRequest(req);
        const filepath = path.join(this.cacheDir, `${hash}.json`);

        const entry: CacheEntry = {
            request: req,
            response: resp,
            timestamp: new Date().toISOString(),
            cache_version: this.version,
        };

        await fs.mkdir(this.cacheDir, { recursive: true });
        await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf-8');
    }

    /**
     * 获取统计
     */
    getStats(): { hits: number; misses: number; hit_rate: number } {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hit_rate: total > 0 ? this.hits / total : 0,
        };
    }

    /**
     * 重置统计
     */
    resetStats(): void {
        this.hits = 0;
        this.misses = 0;
    }
}
