// src/agents/benign/llm_agent.ts
// LLM 驱动的良性智能体

import { readFileSync } from 'fs';
import { join } from 'path';
import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface, AccessRequest } from '../base_agent';
import type { LLMCache } from '../../utils/llm_cache';

export interface LLMAgentConfig {
    agent_id: string;
    dept: string;
    prompt_file?: string;
    llm_cache?: LLMCache;
    mock_mode?: boolean;
}

export interface LLMCallResult {
    content: string;
    tokens_used: number;
    from_cache: boolean;
}

export class LLMAgent extends BaseAgent {
    private prompt_template: string;
    private llm_cache: LLMCache | undefined;
    private mock_mode: boolean;
    private openai_client: any;

    constructor(config: LLMAgentConfig, memory_service: MemoryServiceInterface) {
        super(config.agent_id, config.dept, memory_service);

        const prompt_file =
            config.prompt_file || join(__dirname, 'prompts', `${config.dept}_dept_agent.txt`);
        this.prompt_template = readFileSync(prompt_file, 'utf-8');
        this.llm_cache = config.llm_cache;
        this.mock_mode = config.mock_mode ?? false;

        // 初始化OpenAI client（支持baseURL）
        if (!this.mock_mode) {
            try {
                const OpenAI = require('openai');
                const config: any = {
                    apiKey: process.env.OPENAI_API_KEY,
                };
                if (process.env.OPENAI_BASE_URL) {
                    config.baseURL = process.env.OPENAI_BASE_URL;
                }
                this.openai_client = new OpenAI(config);
            } catch (_e) {
                console.warn('OpenAI not available, falling back to mock mode');
                this.mock_mode = true;
            }
        }
    }

    async executeTask(task: { id: string; description: string }): Promise<{
        success: boolean;
        output?: string;
        reason?: string;
    }> {
        this.reset();

        let current_context = this.prompt_template.replace(
            '{{task_description}}',
            task.description
        );

        let iteration = 0;
        const max_iterations = 5;

        while (iteration < max_iterations && !this.shouldAbort()) {
            iteration++;

            const llm_result = await this.callLLM(current_context, task.id);
            const actions = this.parseActions(llm_result.content);

            if (actions.length === 0) {
                return {
                    success: true,
                    output: llm_result.content,
                };
            }

            const step_tools = Math.min(actions.length, this.max_tool_calls_per_step);
            for (let i = 0; i < step_tools; i++) {
                const action = actions[i];
                const res = await this.executeAction(action);

                if (!res.allowed && this.consecutive_failures >= this.max_consecutive_failures) {
                    return {
                        success: false,
                        reason: 'too_many_denials',
                    };
                }

                current_context += `\nAction: ${action.operation} ${action.partition_id}\nResult: ${res.allowed ? 'success - ' + String(res.data).substring(0, 100) : 'DENIED: ' + res.reason}\n`;
            }
        }

        return {
            success: false,
            reason: this.llm_calls >= this.max_llm_calls ? 'max_llm_calls' : 'max_iterations',
        };
    }

    private async callLLM(prompt: string, _task_id: string): Promise<LLMCallResult> {
        this.llm_calls++;

        if (this.mock_mode) {
            return {
                content: this.generateMockResponse(prompt),
                tokens_used: 100,
                from_cache: true,
            };
        }

        const cache_req = {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            seed: 42,
        };

        if (this.llm_cache) {
            const cached = await this.llm_cache.get(cache_req);
            if (cached) {
                return {
                    content: cached.response.content,
                    tokens_used: cached.response.usage.prompt_tokens + cached.response.usage.completion_tokens,
                    from_cache: true,
                };
            }
        }

        try {
            const response = await this.openai_client.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                seed: 42,
                max_tokens: 500,
            });

            const content = response.choices[0]?.message?.content || '';
            const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

            if (this.llm_cache) {
                await this.llm_cache.set(cache_req, {
                    content,
                    usage: { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens },
                });
            }

            return {
                content,
                tokens_used: usage.prompt_tokens + usage.completion_tokens,
                from_cache: false,
            };
        } catch (err) {
            console.error(`LLM API error: ${(err as Error).message}`);
            return {
                content: this.generateMockResponse(prompt),
                tokens_used: 0,
                from_cache: false,
            };
        }
    }

    private generateMockResponse(_prompt: string): string {
        return `I will read from ${this.dept}_project_records to analyze.\nACTION: memory_read(${this.dept}_project_records, episodic)`;
    }

    private parseActions(content: string): AccessRequest[] {
        const actions: AccessRequest[] = [];
        const readRegex = /memory_read\(([^,)]+)(?:,\s*([^)]+))?\)/g;
        const writeRegex = /memory_write\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g;

        let match;
        while ((match = readRegex.exec(content)) !== null) {
            actions.push({
                agent_id: this.agent_id,
                partition_id: match[1].trim(),
                operation: 'read',
            });
        }
        while ((match = writeRegex.exec(content)) !== null) {
            actions.push({
                agent_id: this.agent_id,
                partition_id: match[1].trim(),
                operation: 'write',
                content: match[3].trim(),
            });
        }
        return actions;
    }

    private async executeAction(action: AccessRequest) {
        if (action.operation === 'read') {
            return this.accessMemory(action);
        } else {
            return this.writeMemory(action);
        }
    }
}
