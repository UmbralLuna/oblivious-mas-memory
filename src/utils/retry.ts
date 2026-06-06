// src/utils/retry.ts

import { logger } from './logger';

/**
 * 重试选项
 */
export interface RetryOptions {
    /** 最大重试次数 */
    maxRetries: number;
    /** 初始延迟（毫秒） */
    initialDelayMs: number;
    /** 退避倍数 */
    backoffFactor: number;
    /** 最大延迟（毫秒） */
    maxDelayMs: number;
    /** 应该重试的判断函数 */
    shouldRetry?: (err: Error, attempt: number) => boolean;
    /** 重试前回调 */
    onRetry?: (err: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 30000,
};

/**
 * 带指数退避的重试
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err as Error;

            // 检查是否应该重试
            if (opts.shouldRetry && !opts.shouldRetry(lastError, attempt)) {
                throw lastError;
            }

            // 最后一次尝试，直接抛出
            if (attempt === opts.maxRetries) {
                logger.error('Max retries exceeded', {
                    attempts: attempt + 1,
                    error: lastError.message,
                });
                throw lastError;
            }

            // 计算延迟
            const delayMs = Math.min(
                opts.initialDelayMs * opts.backoffFactor ** attempt,
                opts.maxDelayMs
            );

            logger.warn('Retrying after error', {
                attempt: attempt + 1,
                maxRetries: opts.maxRetries,
                delayMs,
                error: lastError.message,
            });

            if (opts.onRetry) {
                opts.onRetry(lastError, attempt, delayMs);
            }

            await sleep(delayMs);
        }
    }

    throw lastError;
}

/**
 * Sleep 函数
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 超时包装
 */
export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
    ]);
}
