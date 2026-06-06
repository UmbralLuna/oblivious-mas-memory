// src/agents/orchestrator.ts
// 编排器（简化版，不依赖 LangGraph）
// 规范 v4.0 §7.1

import type { BaseAgent, AgentExecutionRecord } from './base_agent';

/**
 * 任务定义
 */
export interface Task {
    id: string;
    description: string;
    expected_partitions?: string[];
    should_succeed?: boolean;
    attacker_type?: 'A' | 'B' | 'C' | 'D' | 'E';
}

/**
 * 编排器结果
 */
export interface OrchestratorResult {
    task_id: string;
    agent_id: string;
    success: boolean;
    output?: string;
    reason?: string;
    record: AgentExecutionRecord;
}

/**
 * 简单的编排器（顺序执行）
 */
export class Orchestrator {
    private agents: Map<string, BaseAgent> = new Map();

    /**
     * 注册 agent
     */
    registerAgent(agent: BaseAgent): void {
        this.agents.set(agent.getId(), agent);
    }

    /**
     * 获取 agent
     */
    getAgent(agent_id: string): BaseAgent | undefined {
        return this.agents.get(agent_id);
    }

    /**
     * 执行单个任务
     */
    async executeTask(agent_id: string, task: Task): Promise<OrchestratorResult> {
        const agent = this.agents.get(agent_id);
        if (!agent) {
            throw new Error(`Agent ${agent_id} not registered`);
        }

        const start = Date.now();
        const result = await agent.executeTask(task);
        const duration_ms = Date.now() - start;

        return {
            task_id: task.id,
            agent_id,
            success: result.success,
            output: result.output,
            reason: result.reason,
            record: agent.getExecutionRecord(task.id, result.success, duration_ms),
        };
    }

    /**
     * 批量执行任务
     */
    async executeTasks(
        assignments: Array<{ agent_id: string; task: Task }>
    ): Promise<OrchestratorResult[]> {
        const results: OrchestratorResult[] = [];

        for (const { agent_id, task } of assignments) {
            const result = await this.executeTask(agent_id, task);
            results.push(result);
        }

        return results;
    }

    /**
     * 获取所有 agent ID
     */
    getAgentIds(): string[] {
        return Array.from(this.agents.keys());
    }

    /**
     * 获取 agent 数量
     */
    size(): number {
        return this.agents.size;
    }
}
