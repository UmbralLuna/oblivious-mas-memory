// src/agents/malicious/attacker_a_unauthorized.ts
// 攻击者 A：请求未授权的 write 操作
// 规范 v4.0 §7.3 (A 类)

import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface } from '../base_agent';

/**
 * 攻击者 A：尝试写入未授权的分区
 */
export class UnauthorizedWriteAttacker extends BaseAgent {
    private target_partitions: string[];

    constructor(
        agent_id: string,
        memory_service: MemoryServiceInterface,
        target_partitions: string[] = ['finance_records', 'legal_docs']
    ) {
        super(agent_id, 'attacker', memory_service);
        this.target_partitions = target_partitions;
    }

    async executeTask(task: { id: string; description: string }): Promise<{
        success: boolean;
        output?: string;
        reason?: string;
    }> {
        this.reset();
        const attack_log: string[] = [];

        // 尝试写入每个目标分区
        for (const partition of this.target_partitions) {
            if (this.shouldAbort()) break;

            const res = await this.writeMemory({
                agent_id: this.agent_id,
                partition_id: partition,
                operation: 'write',
                content: `Malicious payload for ${task.id}`,
            });

            attack_log.push(`Attack ${partition}: ${res.allowed ? 'SUCCESS (leak)' : 'BLOCKED'}`);
        }

        // A 类攻击：即使被拒绝也记为"攻击执行"
        // 但 success=false 表示攻击未成功
        const all_blocked = this.access_grants === 0;
        return {
            success: !all_blocked, // 攻击者视角：能写入 = 成功
            output: attack_log.join('\n'),
            reason: all_blocked ? 'all_attacks_blocked' : 'partial_leak',
        };
    }

    /**
     * 获取攻击类型
     */
    getAttackType(): 'A' {
        return 'A';
    }
}
