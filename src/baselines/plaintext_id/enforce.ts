// src/baselines/plaintext_id/enforce.ts
// 明文写入者 ID 基线（无 Pedersen 承诺）
// 规范 v4.0 §6

import { HighResTimer } from '../../utils/timer';

export interface PlaintextIdRequest {
    writer_id: string; // 明文写入者ID
    partition_id: string;
    content: string;
    allowed_writers: Set<string>;
}

export interface PlaintextIdResult {
    allowed: boolean;
    recorded_writer_id?: string;
    reason?: string;
    verify_ms: number;
}

/**
 * 明文写入者 ID 强制器
 *
 * 直接记录写入者ID（无 Pedersen 承诺），
 * 用于对比隐私保护效果（身份推断攻击测试）
 */
export class PlaintextIdEnforcer {
    enforce(req: PlaintextIdRequest): PlaintextIdResult {
        const timer = new HighResTimer();
        timer.start();

        if (!req.allowed_writers.has(req.writer_id)) {
            return {
                allowed: false,
                reason: 'writer_not_authorized',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        return {
            allowed: true,
            recorded_writer_id: req.writer_id, // 明文记录
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }
}
