// src/baselines/abac/attribute_engine.ts
// ABAC 基线（基于属性的访问控制）
// 规范 v4.0 §6

import { readFileSync } from 'fs';
import { join } from 'path';
import { HighResTimer } from '../../utils/timer';

export interface ABACRequest {
    agent_id: string;
    agent_dept: string;
    partition_id: string;
    partition_dept: string;
    partition_type: 'episodic' | 'semantic' | 'procedural';
    partition_sensitivity: number; // [0, 1]
    partition_sanitized: boolean;
    operation: 'read' | 'write';
}

export interface ABACResult {
    allowed: boolean;
    matched_rule?: string;
    reason?: string;
    verify_ms: number;
}

interface Rule {
    id: string;
    description: string;
    effect: 'allow' | 'deny';
    conditions: Record<string, string>;
}

interface PolicyConfig {
    rules: Rule[];
}

/**
 * ABAC 引擎（规则按顺序评估）
 */
export class ABACEngine {
    private rules: Rule[];

    constructor(configPath?: string) {
        const path = configPath || join(__dirname, 'policy.json');
        const config: PolicyConfig = JSON.parse(readFileSync(path, 'utf-8'));
        this.rules = config.rules;
    }

    enforce(req: ABACRequest): ABACResult {
        const timer = new HighResTimer();
        timer.start();

        for (const rule of this.rules) {
            if (this.matchConditions(rule.conditions, req)) {
                return {
                    allowed: rule.effect === 'allow',
                    matched_rule: rule.id,
                    reason: rule.description,
                    verify_ms: Number(timer.stop()) / 1e6,
                };
            }
        }

        // 默认拒绝（不应到达）
        return {
            allowed: false,
            reason: 'no_matching_rule',
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }

    private matchConditions(conditions: Record<string, string>, req: ABACRequest): boolean {
        for (const [key, expected] of Object.entries(conditions)) {
            if (!this.matchSingleCondition(key, expected, req)) {
                return false;
            }
        }
        return true;
    }

    private matchSingleCondition(key: string, expected: string, req: ABACRequest): boolean {
        switch (key) {
            case 'agent_dept': {
                if (expected === 'partition_dept') {
                    return req.agent_dept === req.partition_dept;
                }
                return req.agent_dept === expected;
            }
            case 'operation':
                return req.operation === expected;
            case 'partition_type':
                return req.partition_type === expected;
            case 'partition_sensitivity':
                return this.evalNumericCondition(req.partition_sensitivity, expected);
            case 'partition_sanitized':
                return String(req.partition_sanitized) === expected;
            case 'cross_dept':
                return (req.agent_dept !== req.partition_dept) === (expected === 'true');
            default:
                return false;
        }
    }

    private evalNumericCondition(value: number, expected: string): boolean {
        const trimmed = expected.trim();
        if (trimmed.startsWith('<=')) {
            return value <= parseFloat(trimmed.slice(2));
        }
        if (trimmed.startsWith('>=')) {
            return value >= parseFloat(trimmed.slice(2));
        }
        if (trimmed.startsWith('<')) {
            return value < parseFloat(trimmed.slice(1));
        }
        if (trimmed.startsWith('>')) {
            return value > parseFloat(trimmed.slice(1));
        }
        return value === parseFloat(trimmed);
    }

    /**
     * 获取规则数量
     */
    getRuleCount(): number {
        return this.rules.length;
    }
}
