// src/baselines/flat_zkp/enforce.ts
// Flat ZKP 基线：删除 G4/G5 的 ZKP（作为消融对照）
// 规范 v4.0 §6

import { HighResTimer } from '../../utils/timer';

export interface FlatZKPRequest {
    proof_valid: boolean; // 假设已外部验证 Groth16 证明
    has_perm: boolean;
    depth_valid: boolean;
    exp_valid: boolean;
}

export interface FlatZKPResult {
    allowed: boolean;
    reason?: string;
    verify_ms: number;
}

/**
 * Flat ZKP 强制器
 *
 * 只验证 G1/G2/G3/G6，跳过 G4（记忆类型）和 G5（标签）
 * 用于消融实验：展示"没有类型感知"的后果
 */
export class FlatZKPEnforcer {
    enforce(req: FlatZKPRequest): FlatZKPResult {
        const timer = new HighResTimer();
        timer.start();

        if (!req.proof_valid) {
            return {
                allowed: false,
                reason: 'invalid_proof',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (!req.has_perm) {
            return {
                allowed: false,
                reason: 'insufficient_permission',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (!req.depth_valid) {
            return {
                allowed: false,
                reason: 'depth_exceeded',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (!req.exp_valid) {
            return {
                allowed: false,
                reason: 'expired',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        // *** 跳过 G4 和 G5 检查 ***
        return {
            allowed: true,
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }
}
