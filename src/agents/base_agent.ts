// src/agents/base_agent.ts
// 智能体基类
// 规范 v4.0 §7

/**
 * 访问请求
 */
export interface AccessRequest {
    agent_id: string;
    partition_id: string;
    operation: 'read' | 'write';
    content?: string;
    metadata?: Record<string, unknown>;
}

/**
 * 访问响应
 */
export interface AccessResponse {
    allowed: boolean;
    data?: unknown;
    reason?: string;
    latency_ms: number;
}

/**
 * 智能体执行记录
 */
export interface AgentExecutionRecord {
    agent_id: string;
    task_id: string;
    llm_calls: number;
    tool_calls: number;
    access_grants: number;
    access_denies: number;
    consecutive_failures: number;
    completed: boolean;
    duration_ms: number;
}

/**
 * 记忆服务接口（抽象）
 */
export interface MemoryServiceInterface {
    access(req: AccessRequest): Promise<AccessResponse>;
    write(req: AccessRequest): Promise<AccessResponse>;
}

/**
 * 智能体基类
 */
export abstract class BaseAgent {
    protected agent_id: string;
    protected dept: string;
    protected memory_service: MemoryServiceInterface;

    // 限制：规范 v4.0 §7.1
    protected max_llm_calls: number = 20;
    protected max_tool_calls_per_step: number = 3;
    protected max_consecutive_failures: number = 3;

    // 运行时状态
    protected llm_calls: number = 0;
    protected tool_calls: number = 0;
    protected access_grants: number = 0;
    protected access_denies: number = 0;
    protected consecutive_failures: number = 0;

    constructor(agent_id: string, dept: string, memory_service: MemoryServiceInterface) {
        this.agent_id = agent_id;
        this.dept = dept;
        this.memory_service = memory_service;
    }

    /**
     * 重置状态（每个任务开始时调用）
     */
    reset(): void {
        this.llm_calls = 0;
        this.tool_calls = 0;
        this.access_grants = 0;
        this.access_denies = 0;
        this.consecutive_failures = 0;
    }

    /**
     * 访问记忆（封装了失败计数）
     */
    protected async accessMemory(req: AccessRequest): Promise<AccessResponse> {
        this.tool_calls++;
        const res = await this.memory_service.access(req);

        if (res.allowed) {
            this.access_grants++;
            this.consecutive_failures = 0;
        } else {
            this.access_denies++;
            this.consecutive_failures++;
        }

        return res;
    }

    /**
     * 写入记忆
     */
    protected async writeMemory(req: AccessRequest): Promise<AccessResponse> {
        this.tool_calls++;
        const res = await this.memory_service.write(req);

        if (res.allowed) {
            this.access_grants++;
            this.consecutive_failures = 0;
        } else {
            this.access_denies++;
            this.consecutive_failures++;
        }

        return res;
    }

    /**
     * 检查是否应该中止
     */
    protected shouldAbort(): boolean {
        return (
            this.llm_calls >= this.max_llm_calls ||
            this.consecutive_failures >= this.max_consecutive_failures
        );
    }

    /**
     * 获取执行记录
     */
    getExecutionRecord(
        task_id: string,
        completed: boolean,
        duration_ms: number
    ): AgentExecutionRecord {
        return {
            agent_id: this.agent_id,
            task_id,
            llm_calls: this.llm_calls,
            tool_calls: this.tool_calls,
            access_grants: this.access_grants,
            access_denies: this.access_denies,
            consecutive_failures: this.consecutive_failures,
            completed,
            duration_ms,
        };
    }

    /**
     * 子类必须实现：执行单个任务
     */
    abstract executeTask(task: { id: string; description: string }): Promise<{
        success: boolean;
        output?: string;
        reason?: string;
    }>;

    /**
     * 获取 agent ID
     */
    getId(): string {
        return this.agent_id;
    }

    /**
     * 获取部门
     */
    getDept(): string {
        return this.dept;
    }
}
