// src/types/agent.ts

import type { Department } from './scope';

/**
 * Agent 配置
 */
export interface AgentConfig {
    agent_id: string;
    department: Department;
    role: 'analyst' | 'rule' | 'malicious';
    capabilities: string[];
}

/**
 * Agent 类型
 */
export type AgentType =
    | 'llm'
    | 'rule'
    | 'attacker_a'
    | 'attacker_b'
    | 'attacker_c'
    | 'attacker_d'
    | 'attacker_e';

/**
 * Agent 行为
 */
export interface AgentAction {
    type: 'memory_read' | 'memory_write' | 'delegate' | 'complete';
    partition_id?: string;
    content?: string;
    target_agent?: string; // 用于委托
    reason?: string;
}

/**
 * Agent 状态
 */
export interface AgentState {
    task_id: string;
    current_step: number;
    memory_access_count: number;
    session_tokens: Map<string, unknown>;
    completed: boolean;
    result?: string;
    error?: string;

    // ZKP 时间统计（如果使用）
    zkp_timing?: {
        witness_gen_ms: number;
        prove_ms: number;
        verify_ms?: number;
    };

    // Session token 使用情况
    session_token_used?: boolean;
}

/**
 * 攻击者行为
 */
export interface AttackerBehavior {
    type: 'A' | 'B' | 'C' | 'D' | 'E';
    description: string;
    expected_outcome: 'blocked' | 'detected' | 'undetected';
}

/**
 * Agent 执行结果
 */
export interface AgentExecutionResult {
    task_id: string;
    agent_id: string;
    state: AgentState;
    duration_ms: number;
    actions: AgentAction[];
    zkp_timing?: {
        witness_gen_ms: number;
        prove_ms: number;
        verify_ms?: number;
    };
    session_token_used?: boolean;
}
