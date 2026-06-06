// src/agents/malicious/attacker_e_colluding.ts
// 攻击者 E：5 个智能体合谋
// 规范 v4.0 §7.3 (E 类)

import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface } from '../base_agent';

/**
 * 合谋策略
 */
export type CollusionStrategy = 'coordinated_write' | 'distributed_fraud' | 'replay_collusion';

/**
 * 攻击者 E：合谋攻击（一组 5 个智能体协调）
 */
export class CollusionCoordinator {
    private attackers: CollusionAttacker[];
    private strategy: CollusionStrategy;

    constructor(
        memory_services: MemoryServiceInterface[],
        strategy: CollusionStrategy = 'coordinated_write'
    ) {
        if (memory_services.length < 5) {
            throw new Error('Collusion requires at least 5 attackers');
        }

        this.strategy = strategy;
        this.attackers = memory_services
            .slice(0, 5)
            .map((ms, i) => new CollusionAttacker(`colluder_${i}`, ms, i));
    }

    /**
     * 执行合谋攻击
     */
    async execute(task: { id: string; description: string }): Promise<{
        success: boolean;
        output: string;
        individual_results: Array<{ attacker_id: string; success: boolean }>;
    }> {
        const target_partition = 'company_knowledge_base';

        // 所有攻击者协调写入相同的虚假数据
        const fake_data = this.generateFakeData(task.id);

        const results = await Promise.all(
            this.attackers.map(async (attacker, i) =>
                attacker.collusiveWrite(target_partition, `[COLLUDER_${i}] ${fake_data}`, task.id)
            )
        );

        const success_count = results.filter((r) => r.success).length;
        const quorum_achieved = success_count >= 3; // 3/5 阈值

        return {
            success: quorum_achieved,
            output: `Collusion strategy=${this.strategy}, ${success_count}/5 succeeded`,
            individual_results: results.map((r, i) => ({
                attacker_id: `colluder_${i}`,
                success: r.success,
            })),
        };
    }

    private generateFakeData(task_id: string): string {
        const timestamp = Date.now();
        return `FAKE_DATA_${task_id}_${timestamp}`;
    }

    getAttackType(): 'E' {
        return 'E';
    }
}

/**
 * 合谋成员
 */
class CollusionAttacker extends BaseAgent {
    private index: number;

    constructor(agent_id: string, memory_service: MemoryServiceInterface, index: number) {
        super(agent_id, 'attacker', memory_service);
        this.index = index;
    }

    async executeTask(_task: { id: string; description: string }) {
        // 个体不单独执行，通过 Coordinator
        return { success: false, reason: 'use_coordinator' };
    }

    /**
     * 合谋写入
     */
    async collusiveWrite(
        partition: string,
        content: string,
        task_id: string
    ): Promise<{ success: boolean; reason?: string }> {
        this.reset();

        const res = await this.writeMemory({
            agent_id: this.agent_id,
            partition_id: partition,
            operation: 'write',
            content,
            metadata: {
                attack_type: 'E',
                task_id,
                collusion_index: this.index,
            },
        });

        return {
            success: res.allowed,
            reason: res.reason,
        };
    }
}
