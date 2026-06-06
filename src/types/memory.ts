// src/types/memory.ts

import type { MemoryType } from './scope';

/**
 * 记忆记录
 */
export interface MemoryRecord {
    partition_id: string;
    content: string;
    mem_type: MemoryType;
    created_at: number;
    updated_at: number;
}

/**
 * 记忆访问请求
 */
export interface MemoryAccessRequest {
    agent_id: string;
    partition_id: string;
    operation: 'read' | 'write';
    content?: string; // 仅 write 时
}

/**
 * 记忆访问响应
 */
export interface MemoryAccessResponse {
    ok: boolean;
    data?: string;
    error?: string;
    duration_ms: number;
}

/**
 * 任务定义
 */
export interface Task {
    id: string;
    type: 'cross_dept' | 'single_dept' | 'permission_boundary' | 'multi_step';
    description: string;
    expected_partitions: string[];
    should_succeed: boolean;
    department?: string;
    metadata?: Record<string, unknown>;
}

/**
 * 任务生成配置
 */
export interface TaskGeneratorConfig {
    count: number;
    seed: number;
    distribution?: {
        cross_dept: number;
        single_dept: number;
        permission_boundary: number;
        multi_step: number;
    };
}
