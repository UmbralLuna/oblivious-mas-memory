// src/memory_service/routes/write.ts
// POST /write 路由（带来源证明）
// 规范 v4.0 §5.5 + §5.6

import type { Request, Response } from 'express';
import { verifyWriteProof } from '../../verifier/verify';
import type { NullifierSet } from '../../verifier/nullifier_set';
import type { PartitionStorage, MemoryType } from '../storage';
import type { AuditLog } from '../audit_log';
import type { EscrowService } from '../escrow';
import type { TrustScoreManager } from '../trust_score';

export interface WriteContext {
    nullifier_set: NullifierSet;
    storage: PartitionStorage;
    audit_log: AuditLog;
    escrow: EscrowService;
    trust: TrustScoreManager;
    write_vkey_path: string;
}

/**
 * POST /write
 *
 * 请求体：
 * {
 *   proof: object,
 *   publicSignals: string[],
 *   content: string,
 *   org_id: string,
 *   agent_pk_hash: string,
 *   escrow_secret: { id_writer: string, r_pedersen: string }// 必选（论文§5.3）
 * }
 *
 * 响应：
 * 200 { written: true, partition_id: string, verify_ms: number }
 * 400 { reason: string }
 */
export function createWriteHandler(ctx: WriteContext) {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { proof, publicSignals, content, org_id, agent_pk_hash, escrow_secret } =
                req.body;

            if (!proof || !publicSignals || !content || !org_id || !agent_pk_hash || !escrow_secret) {
                res.status(400).json({ reason: 'missing_fields' });
                return;
            }

            // 公共信号：[h_w, C_w[0], C_w[1], rt_scope, M_target, tau_target, pk_issuer[0], pk_issuer[1], nullifier_w, current_time]
            if (publicSignals.length < 10) {
                res.status(400).json({ reason: 'invalid_public_signals' });
                return;
            }

            const h_w = publicSignals[0];
            const M_target = publicSignals[4];
            const tau_target = parseInt(publicSignals[5], 10);
            const nullifier_w = publicSignals[8];

            // 1. 检查 nullifier（防重放）
            if (ctx.nullifier_set.has(1, nullifier_w)) {
                ctx.audit_log.append({
                    event_type: 'write_reject',
                    actor_pk_hash: agent_pk_hash,
                    metadata: { h_w, reason: 'replay' },
                });
                res.status(400).json({ reason: 'replay_detected' });
                return;
            }

            // 2. 验证 Groth16 证明
            const verify_result = await verifyWriteProof(proof, publicSignals, ctx.write_vkey_path);

            if (!verify_result.valid) {
                ctx.audit_log.append({
                    event_type: 'write_reject',
                    actor_pk_hash: agent_pk_hash,
                    metadata: { h_w, reason: 'invalid_proof' },
                });

                // 降低信任度
                ctx.trust.record({
                    actor_pk_hash: agent_pk_hash,
                    event_type: 'bad',
                    magnitude: 0.5,
                    timestamp: Date.now(),
                });

                res.status(400).json({
                    reason: 'invalid_proof',
                    verify_ms: verify_result.verify_ms,
                });
                return;
            }

            // 3. 记录 nullifier
            ctx.nullifier_set.add(1, nullifier_w);

            // 4. 提交 escrow（必选，论文§5.3）
            try {
                ctx.escrow.submit(h_w, escrow_secret);
            } catch (err) {
                // escrow 已存在，忽略
            }

            // 5. 写入存储
            const writer_commit = `${publicSignals[1]},${publicSignals[2]}`;
            ctx.storage.write({
                partition_id: M_target,
                org_id,
                mem_type: tau_target as MemoryType,
                content,
                tags: 0,
                sensitivity: 0,
                writer_commit,
            });

            // 6. 记录审计
            ctx.audit_log.append({
                event_type: 'write_submit',
                actor_pk_hash: agent_pk_hash,
                metadata: {
                    h_w,
                    partition_id: M_target,
                    org_id,
                    mem_type: tau_target,
                },
            });

            // 7. 提升信任度
            ctx.trust.record({
                actor_pk_hash: agent_pk_hash,
                event_type: 'good',
                magnitude: 0.1,
                timestamp: Date.now(),
            });

            res.status(200).json({
                written: true,
                partition_id: M_target,
                verify_ms: verify_result.verify_ms,
            });
        } catch (err: any) {
            res.status(500).json({ reason: 'internal_error', error: err.message });
        }
    };
}
