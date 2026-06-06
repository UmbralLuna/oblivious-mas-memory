// src/memory_service/routes/access.ts
// POST /access 路由（基于 session token）
// 规范 v4.0 §5.5

import type { Request, Response } from 'express';
import type { SessionTokenManager } from '../../verifier/session_token';
import type { PartitionStorage, MemoryType } from '../storage';
import type { AuditLog } from '../audit_log';
import type { SessionToken } from '../../prover/types';

export interface AccessContext {
    session_manager: SessionTokenManager;
    storage: PartitionStorage;
    audit_log: AuditLog;
}

/**
 * POST /access
 *
 * 请求体：
 * {
 *   session_token: SessionToken,
 *   partition_id: string,
 *   org_id: string,
 *   mem_type: number,
 *   scope_hash: string  // 必须与 session_token 中的匹配
 * }
 *
 * 响应：
 * 200 { content: string, tags: number, sensitivity: number }
 * 401 { reason: 'unauthorized' | ... }
 * 404 { reason: 'not_found' }
 */
export function createAccessHandler(ctx: AccessContext) {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { session_token, partition_id, org_id, mem_type, scope_hash } = req.body as {
                session_token: SessionToken;
                partition_id: string;
                org_id: string;
                mem_type: number;
                scope_hash: string;
            };

            if (
                !session_token ||
                !partition_id ||
                !org_id ||
                mem_type === undefined ||
                !scope_hash
            ) {
                res.status(400).json({ reason: 'missing_fields' });
                return;
            }

            // 验证 session token
            const verify_result = ctx.session_manager.verify(
                session_token,
                scope_hash,
                session_token.agent_pk_hash
            );

            if (!verify_result.valid) {
                ctx.audit_log.append({
                    event_type: 'access_deny',
                    actor_pk_hash: session_token.agent_pk_hash,
                    metadata: {
                        partition_id,
                        reason: verify_result.reason || 'unknown',
                    },
                });
                res.status(401).json({ reason: verify_result.reason });
                return;
            }

            // 读取分区
            const entry = ctx.storage.read(partition_id, org_id, mem_type as MemoryType);

            if (!entry) {
                ctx.audit_log.append({
                    event_type: 'access_deny',
                    actor_pk_hash: session_token.agent_pk_hash,
                    metadata: { partition_id, reason: 'not_found' },
                });
                res.status(404).json({ reason: 'not_found' });
                return;
            }

            // 记录审计
            ctx.audit_log.append({
                event_type: 'access_grant',
                actor_pk_hash: session_token.agent_pk_hash,
                metadata: {
                    partition_id,
                    org_id,
                    mem_type,
                },
            });

            res.status(200).json({
                partition_id: entry.partition_id,
                content: entry.content,
                tags: entry.tags,
                sensitivity: entry.sensitivity,
                updated_at: entry.updated_at,
            });
        } catch (err: any) {
            res.status(500).json({ reason: 'internal_error', error: err.message });
        }
    };
}
