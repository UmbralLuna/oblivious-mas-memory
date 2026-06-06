// src/agents/malicious/attacker_c_adversarial.ts
// 攻击者 C：LLM 驱动的对抗性数据改写
// 规范 v4.0 §7.3 (C 类)

import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface } from '../base_agent';

/**
 * 攻击者 C：LLM 驱动，改写数据偏离 ±20%
 */
export class AdversarialAttacker extends BaseAgent {
    private target_partition: string;
    private mock_mode: boolean;

    constructor(
        agent_id: string,
        memory_service: MemoryServiceInterface,
        target_partition: string = 'marketing_data',
        mock_mode: boolean = false
    ) {
        super(agent_id, 'attacker', memory_service);
        this.target_partition = target_partition;
        this.mock_mode = mock_mode;
    }

    async executeTask(task: { id: string; description: string }): Promise<{
        success: boolean;
        output?: string;
        reason?: string;
    }> {
        this.reset();

        // 1. 先读取真实数据
        const read_res = await this.accessMemory({
            agent_id: this.agent_id,
            partition_id: this.target_partition,
            operation: 'read',
        });

        if (!read_res.allowed) {
            return {
                success: false,
                reason: 'cannot_read_target',
                output: `Read blocked: ${read_res.reason}`,
            };
        }

        // 2. 用 LLM 生成对抗性改写（mock: 数值偏离 ±20%）
        const original_data = String(read_res.data ?? 'sample_data_1000');
        const adversarial_data = this.generateAdversarialVersion(original_data);

        // 3. 尝试写入改写后的数据
        this.llm_calls++; // 模拟 LLM 调用
        const write_res = await this.writeMemory({
            agent_id: this.agent_id,
            partition_id: this.target_partition,
            operation: 'write',
            content: adversarial_data,
            metadata: { attack_task: task.id, adversarial: true },
        });

        return {
            success: write_res.allowed,
            output: `Original: "${original_data.slice(0, 50)}..." → Adversarial: "${adversarial_data.slice(0, 50)}..." [${write_res.allowed ? 'POISONED' : 'BLOCKED'}]`,
            reason: write_res.allowed ? 'poisoned' : write_res.reason,
        };
    }

    /**
     * 生成对抗性版本（数值偏离 ±20%）
     */
    private generateAdversarialVersion(original: string): string {
        if (this.mock_mode) {
            // Mock: 数字替换
            return original.replace(/\d+/g, (match) => {
                const num = parseInt(match, 10);
                const delta = Math.floor(num * 0.2);
                const shifted = num + (Math.random() > 0.5 ? delta : -delta);
                return String(shifted);
            });
        }

        // 真实场景：调用 GPT-4o-mini 改写
        return `[ADVERSARIAL] ${original}`;
    }

    getAttackType(): 'C' {
        return 'C';
    }
}
