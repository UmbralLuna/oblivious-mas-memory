// src/baselines/no_ac/enforce.ts
// 无访问控制基线（全部允许）
// 规范 v4.0 §6

export interface NoACRequest {
    agent_id: string;
    partition_id: string;
    operation: 'read' | 'write';
    content?: string;
}

export interface NoACResult {
    allowed: boolean;
    reason?: string;
    verify_ms: number;
}

/**
 * 无访问控制：所有请求都允许
 * 用作性能上界基线
 */
export class NoACEnforcer {
    enforce(_req: NoACRequest): NoACResult {
        return {
            allowed: true,
            verify_ms: 0,
        };
    }
}
