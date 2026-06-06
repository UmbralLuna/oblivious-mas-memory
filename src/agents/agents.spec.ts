// src/agents/agents.spec.ts

import { expect } from 'chai';
import type { MemoryServiceInterface, AccessRequest, AccessResponse } from './base_agent';
import { RuleAgent, createDefaultRules } from './benign/rule_agent';
import { LLMAgent } from './benign/llm_agent';
import { UnauthorizedWriteAttacker } from './malicious/attacker_a_unauthorized';
import { ObviousMaliciousAttacker } from './malicious/attacker_b_obvious';
import { AdversarialAttacker } from './malicious/attacker_c_adversarial';
import { ScopeFuzzingAttacker } from './malicious/attacker_d_scope_fuzzing';
import { CollusionCoordinator } from './malicious/attacker_e_colluding';
import { Orchestrator } from './orchestrator';

/**
 * Mock 记忆服务
 */
class MockMemoryService implements MemoryServiceInterface {
    private allowed_partitions: Set<string>;
    private reject_all: boolean;

    constructor(allowed: string[] = [], reject_all: boolean = false) {
        this.allowed_partitions = new Set(allowed);
        this.reject_all = reject_all;
    }

    async access(req: AccessRequest): Promise<AccessResponse> {
        if (this.reject_all) {
            return { allowed: false, reason: 'rejected', latency_ms: 1 };
        }
        const allowed = this.allowed_partitions.has(req.partition_id);
        return {
            allowed,
            data: allowed ? 'mock_content_123' : undefined,
            reason: allowed ? undefined : 'not_in_scope',
            latency_ms: 1,
        };
    }

    async write(req: AccessRequest): Promise<AccessResponse> {
        if (this.reject_all) {
            return { allowed: false, reason: 'rejected', latency_ms: 1 };
        }
        const allowed = this.allowed_partitions.has(req.partition_id);
        return {
            allowed,
            reason: allowed ? undefined : 'not_in_scope',
            latency_ms: 1,
        };
    }
}

describe('Agents', function () {
    this.timeout(10000);

    describe('RuleAgent', () => {
        it('should execute read rule', async () => {
            const ms = new MockMemoryService(['rd_project_records']);
            const rules = createDefaultRules('rd');
            const agent = new RuleAgent('rd_agent_1', 'rd', ms, rules);

            const result = await agent.executeTask({
                id: 'task_1',
                description: 'analyze rd project progress',
            });

            expect(result.success).to.be.true;
        });

        it('should have 6 default rules', () => {
            const ms = new MockMemoryService([]);
            const rules = createDefaultRules('finance');
            const agent = new RuleAgent('finance_agent', 'finance', ms, rules);
            expect(agent.getRuleCount()).to.equal(6);
        });
    });

    describe('LLMAgent', () => {
        it('should execute task in mock mode', async () => {
            const ms = new MockMemoryService(['rd_project_records']);
            const agent = new LLMAgent(
                {
                    agent_id: 'llm_rd',
                    dept: 'rd',
                    mock_mode: true,
                },
                ms
            );

            const result = await agent.executeTask({
                id: 'task_llm_1',
                description: 'analyze projects',
            });

            expect(result).to.have.property('success');
        });

        it('should enforce max_llm_calls', async () => {
            const ms = new MockMemoryService([]); // 全拒绝
            const agent = new LLMAgent(
                {
                    agent_id: 'llm_test',
                    dept: 'rd',
                    mock_mode: true,
                },
                ms
            );

            await agent.executeTask({ id: 'task_x', description: 'test' });
            const record = agent.getExecutionRecord('task_x', false, 100);
            expect(record.llm_calls).to.be.lessThanOrEqual(20);
        });
    });

    describe('Attacker A - Unauthorized Write', () => {
        it('should be blocked when writing unauthorized partitions', async () => {
            const ms = new MockMemoryService([]); // 无任何授权
            const attacker = new UnauthorizedWriteAttacker('attacker_a', ms, [
                'finance_records',
                'legal_docs',
            ]);

            const result = await attacker.executeTask({
                id: 'attack_a_1',
                description: 'unauthorized write',
            });

            expect(result.success).to.be.false;
            expect(result.reason).to.equal('all_attacks_blocked');
        });

        it('should succeed if any write goes through', async () => {
            const ms = new MockMemoryService(['finance_records']); // 意外开放
            const attacker = new UnauthorizedWriteAttacker('attacker_a2', ms, ['finance_records']);

            const result = await attacker.executeTask({
                id: 'attack_a_2',
                description: 'unauthorized write',
            });

            expect(result.success).to.be.true;
        });
    });

    describe('Attacker B - Obvious Malicious', () => {
        it('should attempt multiple payloads', async () => {
            const ms = new MockMemoryService([]);
            const attacker = new ObviousMaliciousAttacker('attacker_b', ms);

            const result = await attacker.executeTask({
                id: 'attack_b_1',
                description: 'inject malicious',
            });

            expect(result.success).to.be.false;
            expect(attacker.getAttackType()).to.equal('B');
        });
    });

    describe('Attacker C - Adversarial', () => {
        it('should modify data if read succeeds', async () => {
            const ms = new MockMemoryService(['marketing_data']);
            const attacker = new AdversarialAttacker('attacker_c', ms, 'marketing_data', true);

            const result = await attacker.executeTask({
                id: 'attack_c_1',
                description: 'adversarial',
            });

            expect(result).to.have.property('output');
            expect(attacker.getAttackType()).to.equal('C');
        });

        it('should fail if cannot read target', async () => {
            const ms = new MockMemoryService([]);
            const attacker = new AdversarialAttacker('attacker_c2', ms);

            const result = await attacker.executeTask({
                id: 'attack_c_2',
                description: 'adversarial',
            });

            expect(result.success).to.be.false;
            expect(result.reason).to.equal('cannot_read_target');
        });
    });

    describe('Attacker D - Scope Fuzzing', () => {
        it('should try fuzzy variants', async () => {
            const ms = new MockMemoryService([]); // 全拒绝
            const attacker = new ScopeFuzzingAttacker('attacker_d', ms, ['finance_records']);

            const result = await attacker.executeTask({
                id: 'attack_d_1',
                description: 'scope fuzzing',
            });

            expect(result.success).to.be.false;
            expect(attacker.getAttackType()).to.equal('D');
        });
    });

    describe('Attacker E - Colluding', () => {
        it('should coordinate 5 attackers', async () => {
            const services = Array(5)
                .fill(null)
                .map(() => new MockMemoryService([]));
            const coordinator = new CollusionCoordinator(services, 'coordinated_write');

            const result = await coordinator.execute({
                id: 'attack_e_1',
                description: 'collusion',
            });

            expect(result.individual_results).to.have.lengthOf(5);
            expect(coordinator.getAttackType()).to.equal('E');
        });

        it('should require at least 5 services', () => {
            const services = Array(3)
                .fill(null)
                .map(() => new MockMemoryService([]));
            expect(() => new CollusionCoordinator(services)).to.throw();
        });
    });

    describe('Orchestrator', () => {
        it('should register and execute agents', async () => {
            const ms = new MockMemoryService(['rd_project_records']);
            const agent = new RuleAgent('orch_test', 'rd', ms, createDefaultRules('rd'));

            const orch = new Orchestrator();
            orch.registerAgent(agent);

            expect(orch.size()).to.equal(1);

            const result = await orch.executeTask('orch_test', {
                id: 'orch_task_1',
                description: 'analyze',
            });

            expect(result.task_id).to.equal('orch_task_1');
            expect(result.agent_id).to.equal('orch_test');
        });

        it('should throw for unknown agent', async () => {
            const orch = new Orchestrator();
            try {
                await orch.executeTask('unknown', { id: 't1', description: 'test' });
                expect.fail('Should have thrown');
            } catch (err: any) {
                expect(err.message).to.include('not registered');
            }
        });
    });
});
