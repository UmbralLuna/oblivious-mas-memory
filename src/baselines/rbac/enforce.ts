// src/baselines/rbac/enforce.ts
// RBAC 基线（基于角色的访问控制）
// 规范 v4.0 §6.3

import { readFileSync } from 'fs';
import { join } from 'path';
import { HighResTimer } from '../../utils/timer';

export interface RBACRequest {
    agent_role: string;
    partition_id: string;
    operation: 'read' | 'write';
}

export interface RBACResult {
    allowed: boolean;
    reason?: string;
    verify_ms: number;
}

interface RoleDefinition {
    partitions: Record<string, string[]>;
}

interface RoleConfig {
    roles: Record<string, RoleDefinition>;
}

/**
 * RBAC 强制器
 */
export class RBACEnforcer {
    private roles: Record<string, RoleDefinition>;

    constructor(configPath?: string) {
        const path = configPath || join(__dirname, 'role_definitions.json');
        const config: RoleConfig = JSON.parse(readFileSync(path, 'utf-8'));
        this.roles = config.roles;
    }

    enforce(req: RBACRequest): RBACResult {
        const timer = new HighResTimer();
        timer.start();

        const role = this.roles[req.agent_role];
        if (!role) {
            return {
                allowed: false,
                reason: 'unknown_role',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        const allowed_ops = role.partitions[req.partition_id];
        if (!allowed_ops) {
            return {
                allowed: false,
                reason: 'partition_not_in_role',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        if (!allowed_ops.includes(req.operation)) {
            return {
                allowed: false,
                reason: 'operation_not_allowed',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        return {
            allowed: true,
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }

    /**
     * 获取角色的所有允许分区
     */
    getPartitionsForRole(agent_role: string): string[] {
        const role = this.roles[agent_role];
        return role ? Object.keys(role.partitions) : [];
    }

    /**
     * 获取所有角色
     */
    getAllRoles(): string[] {
        return Object.keys(this.roles);
    }
}
