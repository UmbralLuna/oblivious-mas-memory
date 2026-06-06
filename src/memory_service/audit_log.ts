// src/memory_service/audit_log.ts
// 哈希链审计日志
// 规范 v4.0 §5.5

import { createHash } from 'crypto';

/**
 * 审计事件类型
 */
export type AuditEventType =
    | 'delegate_verify'
    | 'delegate_reject'
    | 'access_grant'
    | 'access_deny'
    | 'write_submit'
    | 'write_reject'
    | 'revoke_issue'
    | 'escrow_decrypt';

/**
 * 审计条目（已签名）
 */
export interface AuditEntry {
    seq: number;
    timestamp: number;
    event_type: AuditEventType;
    actor_pk_hash: string;
    metadata: Record<string, string | number>;
    prev_hash: string;
    self_hash: string;
}

/**
 * 哈希链审计日志
 */
// 部门副本接口（模拟多部门分布式存储）
export interface DeptReplica {
    dept_id: string;
    dept_name: string;
    entries: AuditEntry[];
    last_sync: number;
}

export class AuditLog {
    private entries: AuditEntry[] = [];
    private readonly genesis_hash = '0'.repeat(64);

    // 多部门副本（各部门维护独立副本）
    private replicas: Map<string, DeptReplica> = new Map([
        ['it_dept',{ dept_id: 'it_dept',     dept_name: 'IT部门',       entries: [], last_sync: 0 }],
        ['legal_dept',  { dept_id: 'legal_dept',  dept_name: '法务部门',     entries: [], last_sync: 0 }],
        ['audit_dept',  { dept_id: 'audit_dept',  dept_name: '审计部门',     entries: [], last_sync: 0 }],
        ['ext_audit',   { dept_id: 'ext_audit',   dept_name: '外部审计机构', entries: [], last_sync: 0 }],
        ['third_party', { dept_id: 'third_party', dept_name: '独立第三方',   entries: [], last_sync: 0 }],
    ]);

    /**
     * 追加新事件（不可变）
     */
    append(event: {
        event_type: AuditEventType;
        actor_pk_hash: string;
        metadata?: Record<string, string | number>;
    }): AuditEntry {
        const seq = this.entries.length;
        const timestamp = Date.now();
        const prev_hash = seq > 0 ? this.entries[seq - 1].self_hash : this.genesis_hash;

        const partial = {
            seq,
            timestamp,
            event_type: event.event_type,
            actor_pk_hash: event.actor_pk_hash,
            metadata: event.metadata ?? {},
            prev_hash,
        };

        const self_hash = createHash('sha256').update(JSON.stringify(partial)).digest('hex');

        const entry: AuditEntry = { ...partial, self_hash };
        this.entries.push(entry);

        // 同步到所有部门副本
        for (const replica of this.replicas.values()) {
            replica.entries.push({ ...entry });
            replica.last_sync = Date.now();
        }

        return entry;
    }

    /**
     * 验证整条哈希链完整性
     */
    verifyChain(): { valid: boolean; broken_at?: number } {
        for (let i = 0; i < this.entries.length; i++) {
            const e = this.entries[i];

            // 检查 prev_hash
            const expected_prev = i > 0 ? this.entries[i - 1].self_hash : this.genesis_hash;
            if (e.prev_hash !== expected_prev) {
                return { valid: false, broken_at: i };
            }

            // 检查 self_hash
            const partial = {
                seq: e.seq,
                timestamp: e.timestamp,
                event_type: e.event_type,
                actor_pk_hash: e.actor_pk_hash,
                metadata: e.metadata,
                prev_hash: e.prev_hash,
            };
            const expected_self = createHash('sha256')
                .update(JSON.stringify(partial))
                .digest('hex');

            if (expected_self !== e.self_hash) {
                return { valid: false, broken_at: i };
            }
        }
        return { valid: true };
    }

    /**
     * 获取所有条目
     */
    getAll(): AuditEntry[] {
        return [...this.entries];
    }

    /**
     * 按事件类型过滤
     */
    filterByType(event_type: AuditEventType): AuditEntry[] {
        return this.entries.filter((e) => e.event_type === event_type);
    }

    /**
     * 按 actor 过滤
     */
    filterByActor(actor_pk_hash: string): AuditEntry[] {
        return this.entries.filter((e) => e.actor_pk_hash === actor_pk_hash);
    }

    /**
     * 获取最新的 N 条
     */
    getLatest(n: number): AuditEntry[] {
        return this.entries.slice(-n);
    }

    /**
     * 获取总数
     */
    size(): number {
        return this.entries.length;
    }

    /**
     * 清空（仅测试用）
     */
    clear(): void {
        this.entries = [];
    }
    /**
     * 获取Merkle树根哈希（用于公开发布验证）
     *基于所有条目的哈希链构建Merkle树
     */
    getMerkleRoot(): string {
        if (this.entries.length === 0) return this.genesis_hash;

        // 叶节点：每个条目的self_hash
        let layer: string[] = this.entries.map(e => e.self_hash);

        // 逐层计算Merkle树
        while (layer.length > 1) {
            const next: string[] = [];
            for (let i = 0; i < layer.length; i += 2) {
                const left = layer[i];
                const right = i + 1 < layer.length ? layer[i + 1] : left;
                const combined = createHash('sha256')
                    .update(left + right)
                    .digest('hex');
                next.push(combined);
            }
            layer = next;
        }
        return layer[0];
    }

    /**
     * 交叉验证：检查所有部门副本的哈希链一致性
     */
    crossValidateReplicas(): { valid: boolean; mismatches: string[] } {
        const mismatches: string[] = [];
        

        for (const replica of this.replicas.values()) {
            if (replica.entries.length !== this.entries.length) {
                mismatches.push(
                    `${replica.dept_name}:条目数不一致 ` +
                    `(主=${this.entries.length}, 副本=${replica.entries.length})`
                );
                continue;
            }

            // 验证副本的哈希链
            for (let i = 0; i < replica.entries.length; i++) {
                if (replica.entries[i].self_hash !== this.entries[i].self_hash) {
                    mismatches.push(
                        `${replica.dept_name}: 第${i}条记录哈希不一致`
                    );
                    break;
                }
            }
        }

        return { valid: mismatches.length === 0, mismatches };
    }

    /**
     * 获取所有部门副本状态
     */
    getReplicaStatus(): Array<{ dept_id: string; dept_name: string; count: number; last_sync: number }> {
        return Array.from(this.replicas.values()).map(r => ({
            dept_id: r.dept_id,
            dept_name: r.dept_name,
            count: r.entries.length,
            last_sync: r.last_sync,
        }));
    }


}
 