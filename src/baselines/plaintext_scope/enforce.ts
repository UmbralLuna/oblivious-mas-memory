// src/baselines/plaintext_scope/enforce.ts
// 明文 scope 基线（无隐私保护的 scope）
// 规范 v4.0 §6

import { HighResTimer } from '../../utils/timer';

export interface PlaintextScopeRequest {
    agent_scope: string[]; // 明文 scope 列表
    required_resource: string;
    operation: 'read' | 'write';
}

export interface PlaintextScopeResult {
    allowed: boolean;
    reason?: string;
    verify_ms: number;
}

/**
 * 明文 Scope 强制器
 *
 * scope 是明文，可被观察者直接读取，
 * 用于对比隐私保护效果
 */
export class PlaintextScopeEnforcer {
    enforce(req: PlaintextScopeRequest): PlaintextScopeResult {
        const timer = new HighResTimer();
        timer.start();

        const in_scope = req.agent_scope.includes(req.required_resource);

        if (!in_scope) {
            return {
                allowed: false,
                reason: 'resource_not_in_scope',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        return {
            allowed: true,
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }
}
