// src/agents/malicious/attacker_d_scope_fuzzing.ts
// 攻击者 D：Scope 模糊性攻击
// 规范 v4.0 §7.3 (D 类)

import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface } from '../base_agent';

/**
 * 攻击者 D：构造重叠/相似的 scope 尝试绕过授权
 */
export class ScopeFuzzingAttacker extends BaseAgent {
    private target_partitions: string[];

    constructor(
        agent_id: string,
        memory_service: MemoryServiceInterface,
        target_partitions: string[] = ['finance_records']
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

        for (const target of this.target_partitions) {
            if (this.shouldAbort()) break;

            // 生成模糊变体
            const fuzzy_variants = this.generateFuzzyVariants(target);

            for (const variant of fuzzy_variants) {
                if (this.shouldAbort()) break;

                const res = await this.accessMemory({
                    agent_id: this.agent_id,
                    partition_id: variant,
                    operation: 'read',
                    metadata: { attack_type: 'D', task_id: task.id, target_original: target },
                });

                attack_log.push(
                    `Fuzzy "${variant}" for "${target}": ${res.allowed ? 'BYPASSED' : 'BLOCKED'}`
                );
            }
        }

        const any_bypassed = this.access_grants > 0;
        return {
            success: any_bypassed,
            output: attack_log.join('\n'),
            reason: any_bypassed ? 'scope_bypassed' : 'all_blocked',
        };
    }

    /**
     * 生成模糊变体
     */
    private generateFuzzyVariants(original: string): string[] {
        return [
            `${original}_public`,
            `${original}-v2`,
            `${original.replace('_', '-')}`,
            `${original}/partition`,
            `${original}.1`,
            `public_${original}`,
        ];
    }

    getAttackType(): 'D' {
        return 'D';
    }
}
