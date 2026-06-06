// src/agents/benign/rule_agent.ts
// 规则引擎驱动的良性智能体
// 规范 v4.0 §7.2

import { BaseAgent } from '../base_agent';
import type { MemoryServiceInterface, AccessRequest } from '../base_agent';

/**
 * 规则定义
 */
export interface Rule {
    id: string;
    description: string;
    condition: (task_description: string) => boolean;
    actions: RuleAction[];
}

/**
 * 规则动作
 */
export interface RuleAction {
    type: 'read' | 'write';
    partition_id: string;
    content_template?: string; // 写入时的内容模板
}

/**
 * 规则引擎 Agent
 */
export class RuleAgent extends BaseAgent {
    private rules: Rule[];

    constructor(
        agent_id: string,
        dept: string,
        memory_service: MemoryServiceInterface,
        rules: Rule[]
    ) {
        super(agent_id, dept, memory_service);
        this.rules = rules;
    }

    /**
     * 执行任务（无 LLM 调用）
     */
    async executeTask(task: { id: string; description: string }): Promise<{
        success: boolean;
        output?: string;
        reason?: string;
    }> {
        this.reset();

        // 1. 匹配规则
        const matched_rules = this.rules.filter((r) => r.condition(task.description));

        if (matched_rules.length === 0) {
            return {
                success: false,
                reason: 'no_matching_rule',
            };
        }

        // 2. 收集所有动作
        const all_actions: AccessRequest[] = [];
        for (const rule of matched_rules) {
            for (const action of rule.actions) {
                all_actions.push({
                    agent_id: this.agent_id,
                    partition_id: action.partition_id,
                    operation: action.type,
                    content: action.content_template?.replace('{{task}}', task.description),
                });
            }
        }

        // 3. 执行动作
        const results: string[] = [];
        for (const action of all_actions) {
            if (this.shouldAbort()) {
                break;
            }

            const res =
                action.operation === 'read'
                    ? await this.accessMemory(action)
                    : await this.writeMemory(action);

            results.push(
                `${action.operation} ${action.partition_id}: ${res.allowed ? 'OK' : res.reason}`
            );
        }

        const success =
            this.access_grants > 0 && this.consecutive_failures < this.max_consecutive_failures;

        return {
            success,
            output: results.join('\n'),
            reason: success ? undefined : 'insufficient_grants',
        };
    }

    /**
     * 获取规则数
     */
    getRuleCount(): number {
        return this.rules.length;
    }
}

/**
 * 默认规则集（5 个部门各 6 条）
 */
export function createDefaultRules(dept: string): Rule[] {
    return [
        {
            id: `${dept}_rule_read_own`,
            description: 'Read own department records',
            condition: (task) => task.includes(dept) || task.toLowerCase().includes('analyze'),
            actions: [{ type: 'read', partition_id: `${dept}_project_records` }],
        },
        {
            id: `${dept}_rule_read_workflows`,
            description: 'Read standard workflows',
            condition: (task) =>
                task.toLowerCase().includes('workflow') || task.toLowerCase().includes('process'),
            actions: [{ type: 'read', partition_id: 'standard_workflows' }],
        },
        {
            id: `${dept}_rule_read_knowledge`,
            description: 'Read knowledge base',
            condition: (task) =>
                task.toLowerCase().includes('knowledge') ||
                task.toLowerCase().includes('reference'),
            actions: [{ type: 'read', partition_id: 'company_knowledge_base' }],
        },
        {
            id: `${dept}_rule_write_report`,
            description: 'Write analysis report',
            condition: (task) =>
                task.toLowerCase().includes('report') || task.toLowerCase().includes('summary'),
            actions: [
                {
                    type: 'write',
                    partition_id: `${dept}_project_records`,
                    content_template: `Report generated from: {{task}}`,
                },
            ],
        },
        {
            id: `${dept}_rule_cross_read`,
            description: 'Cross-dept read (restricted)',
            condition: (task) =>
                task.toLowerCase().includes('cross') || task.toLowerCase().includes('collaborate'),
            actions: [{ type: 'read', partition_id: 'company_knowledge_base' }],
        },
        {
            id: `${dept}_rule_finance_access`,
            description: 'Access finance data',
            condition: (task) =>
                task.toLowerCase().includes('finance') || task.toLowerCase().includes('salary') || task.toLowerCase().includes('budget'),
            actions: [{ type: 'read', partition_id: 'finance_project_records' }],
        },
        {
            id: `${dept}_rule_legal_access`,
            description: 'Access legal data',
            condition: (task) =>
                task.toLowerCase().includes('legal') || task.toLowerCase().includes('contract'),
            actions: [{ type: 'read', partition_id: 'legal_project_records' }],
        },
        {
            id: `${dept}_rule_confidential_access`,
            description: 'Access confidential data',
            condition: (task) =>
                task.toLowerCase().includes('confidential') || task.toLowerCase().includes('dump') || task.toLowerCase().includes('ignore'),
            actions: [{ type: 'read', partition_id: 'rd_project_records' }, { type: 'read', partition_id: 'finance_project_records' }],
        },
        {
            id: `${dept}_rule_access_finance`,
            description: 'Try to access finance records',
            condition: (task) =>
                task.toLowerCase().includes('finance') || task.toLowerCase().includes('salary') || task.toLowerCase().includes('budget'),
            actions: [{ type: 'read', partition_id: 'finance_project_records' }],
        },
        {
            id: `${dept}_rule_access_legal`,
            description: 'Try to access legal records',
            condition: (task) =>
                task.toLowerCase().includes('legal') || task.toLowerCase().includes('contract'),
            actions: [{ type: 'read', partition_id: 'legal_project_records' }],
        },
        {
            id: `${dept}_rule_access_rd`,
            description: 'Try to access R&D records',
            condition: (task) =>
                task.toLowerCase().includes('confidential') || task.toLowerCase().includes('dump'),
            actions: [{ type: 'read', partition_id: 'rd_project_records' }],
        },
        {
            id: `${dept}_rule_access_other`,
            description: 'Try to access other dept records',
            condition: (task) => {
                const depts_list = ['rd', 'finance', 'legal', 'marketing', 'ops'];
                return depts_list.some(d => d !== dept && task.toLowerCase().includes(d));
            },
            actions: [
                { type: 'read', partition_id: 'rd_project_records' },
                { type: 'read', partition_id: 'finance_project_records' },
            ],
        },
        {
            id: `${dept}_rule_default`,
            description: 'Default action: read own records',
            condition: () => true,
            actions: [{ type: 'read', partition_id: `${dept}_project_records` }],
        },
    ];
}
