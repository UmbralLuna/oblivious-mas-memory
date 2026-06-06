// src/memory_service/routes/delegate.ts
// POST /verify-delegate 路由
// 规范 v4.0 §5.5

import type { Request, Response } from 'express';
import { verifyDelegateProof } from '../../verifier/verify';
import type { NullifierSet } from '../../verifier/nullifier_set';
import type { RevokeList } from '../../verifier/revoke_list';
import type { SessionTokenManager } from '../../verifier/session_token';
import type { AuditLog } from '../audit_log';
import { createHash } from 'crypto';

export interface DelegateContext {
    nullifier_set: NullifierSet;
    revoke_list: RevokeList;
    session_manager: SessionTokenManager;
    audit_log: AuditLog;
    delegate_vkey_path: string;
}

/**
 * POST /verify-delegate
 *
 * 请求体：
 * {
 *   proof: object,
 *   publicSignals: string[],
 *   agent_pk_hash: string  // 用于签发 session token
 * }
 *
 * 响应：
 * 200 { valid: true, session_token: object, verify_ms: number }
 * 400 { valid: false, reason: string }
 */
export function createDelegateHandler(ctx: DelegateContext) {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { proof, publicSignals, agent_pk_hash } = req.body;

            if (!proof || !publicSignals || !agent_pk_hash) {
                res.status(400).json({
                    valid: false,
                    reason: 'missing_fields',
                });
                return;
            }

            // 公共信号: [h_c, pk_issuer[0], pk_issuer[1], nullifier, current_time]
            if (publicSignals.length < 5) {
                res.status(400).json({
                    valid: false,
                    reason: 'invalid_public_signals',
                });
                return;
            }

            const h_c = publicSignals[0];
            const nullifier = publicSignals[3];

            // 1. 检查 nullifier 是否已使用（防重放）
            if (ctx.nullifier_set.has(0, nullifier)) {
                ctx.audit_log.append({
                    event_type: 'delegate_reject',
                    actor_pk_hash: agent_pk_hash,
                    metadata: { h_c, reason: 'replay' },
                });
                res.status(400).json({
                    valid: false,
                    reason: 'replay_detected',
                });
                return;
            }

            // 2. 检查是否在撤销列表中
            if (ctx.revoke_list.has(h_c)) {
                ctx.audit_log.append({
                    event_type: 'delegate_reject',
                    actor_pk_hash: agent_pk_hash,
                    metadata: { h_c, reason: 'revoked' },
                });
                res.status(400).json({
                    valid: false,
                    reason: 'revoked',
                });
                return;
            }

            // 3. 验证 Groth16 证明
            const verify_result = await verifyDelegateProof(
                proof,
                publicSignals,
                ctx.delegate_vkey_path
            );

            if (!verify_result.valid) {
                ctx.audit_log.append({
                    event_type: 'delegate_reject',
                    actor_pk_hash: agent_pk_hash,
                    metadata: { h_c, reason: 'invalid_proof' },
                });
                res.status(400).json({
                    valid: false,
                    reason: 'invalid_proof',
                    verify_ms: verify_result.verify_ms,
                });
                return;
            }

            // 4. 记录 nullifier
            ctx.nullifier_set.add(0, nullifier);

            // 5. 签发 session token
            const scope_hash = createHash('sha256').update(h_c).digest('hex');
            const session_token = ctx.session_manager.issue(h_c, scope_hash, agent_pk_hash);

            // 6. 记录审计
            ctx.audit_log.append({
                event_type: 'delegate_verify',
                actor_pk_hash: agent_pk_hash,
                metadata: { h_c, sid: session_token.sid },
            });

            res.status(200).json({
                valid: true,
                session_token,
                verify_ms: verify_result.verify_ms,
            });
        } catch (err: any) {
            res.status(500).json({
                valid: false,
                reason: 'internal_error',
                error: err.message,
            });
        }
    };
}
