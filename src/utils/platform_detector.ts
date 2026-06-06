// src/utils/platform_detector.ts

import os from 'os';
import { execSync } from 'child_process';

export type Platform = 'edge' | 'prod' | 'unknown';

/**
 * 平台配置
 */
export interface PlatformConfig {
    platform: Platform;
    /** Warmup 运行次数 */
    warmupRuns: number;
    /** 冷却等待时间（毫秒） */
    cooldownMs: number;
    /** 批次大小 */
    batchSize: number;
}

/**
 * 检测当前运行平台
 * Edge: MateBook D14 笔记本
 * Prod: 云服务器（AWS/GCP/Azure）
 */
export function detectPlatform(): Platform {
    const cpuModel = os.cpus()[0]?.model || '';
    const totalMem = os.totalmem() / 1024 ** 3; // GB

    // Edge: Intel i5-1240P, 16GB
    if (cpuModel.includes('i5-1240P') && totalMem < 20) {
        return 'edge';
    }

    // Prod: Xeon, 32GB+
    if (cpuModel.includes('Xeon') && totalMem >= 30) {
        return 'prod';
    }

    // 云实例检测
    try {
        const output = execSync('sudo dmidecode -s system-product-name', {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();

        if (
            output.includes('Amazon EC2') ||
            output.includes('Alibaba Cloud') ||
            output.includes('Google Compute Engine') ||
            output.includes('Microsoft Corporation')
        ) {
            return 'prod';
        }
    } catch {
        // dmidecode 不可用
    }

    return 'unknown';
}

/**
 * 强制要求特定平台
 */
export function enforcePlatform(required: Platform): void {
    const actual = detectPlatform();
    if (actual !== required && actual !== 'unknown') {
        throw new Error(`Platform mismatch: required=${required}, actual=${actual}`);
    }
}

/**
 * 获取平台配置
 */
export function getPlatformConfig(): PlatformConfig {
    const platform = detectPlatform();

    return {
        platform,
        warmupRuns: platform === 'edge' ? 3 : 5,
        cooldownMs: platform === 'edge' ? 600_000 : 0, // Edge: 10 分钟冷却
        batchSize: platform === 'edge' ? 100 : 500,
    };
}
