// src/baselines/collaborative_memory/access_control.ts
// 复现 Collaborative Memory (Guo et al., 2025) 的核心访问控制逻辑
// 规范 v4.0 §6.1

import { HighResTimer } from '../../utils/timer';

export interface CMACRequest {
    user_id: string;
    partition_id: string;
    operation: 'read' | 'write';
}

export interface CMACResult {
    allowed: boolean;
    reason?: string;
    verify_ms: number;
}

export interface CMACPolicy {
    allowed_users: Set<string>;
    mem_type: 'episodic' | 'semantic' | 'procedural';
    readonly?: boolean;
}

/**
 * Collaborative Memory 访问控制
 *
 * 核心逻辑（论文 §3.2）：
 * - 每个 partition 有允许用户列表
 * - 明文验证（无密码学保护）
 * - 不区分记忆类型的委托规则
 */
export class CollaborativeMemoryAC {
    private policies = new Map<string, CMACPolicy>();

    /**
     * 设置分区策略
     */
    setPolicy(
        partition_id: string,
        allowed_users: string[],
        mem_type: 'episodic' | 'semantic' | 'procedural',
        readonly: boolean = false
    ): void {
        this.policies.set(partition_id, {
            allowed_users: new Set(allowed_users),
            mem_type,
            readonly,
        });
    }

    /**
     * 检查访问
     */
    checkAccess(req: CMACRequest): CMACResult {
        const timer = new HighResTimer();
        timer.start();

        const policy = this.policies.get(req.partition_id);
        if (!policy) {
            return {
                allowed: false,
                reason: 'partition_not_found',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (!policy.allowed_users.has(req.user_id)) {
            return {
                allowed: false,
                reason: 'user_not_authorized',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (req.operation === 'write' && policy.readonly) {
            return {
                allowed: false,
                reason: 'readonly_partition',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        return {
            allowed: true,
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }

    /**
     * 动态添加用户到分区
     */
    addUser(partition_id: string, user_id: string): boolean {
        const policy = this.policies.get(partition_id);
        if (!policy) return false;
        policy.allowed_users.add(user_id);
        return true;
    }

    /**
     * 动态移除用户
     */
    removeUser(partition_id: string, user_id: string): boolean {
        const policy = this.policies.get(partition_id);
        if (!policy) return false;
        return policy.allowed_users.delete(user_id);
    }

    /**
     * 列出分区
     */
    getPartitions(): string[] {
        return Array.from(this.policies.keys());
    }
}
