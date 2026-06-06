// src/memory_service/routes/audit.ts
// GET /audit-log 路由
// 规范 v4.0 §5.5

import type { Request, Response } from 'express';
import type { AuditLog } from '../audit_log';

export interface AuditContext {
    audit_log: AuditLog;
}

/**
 * GET /audit-log
 *
 * Query params:
 * - limit: number (default 100)
 * - event_type: string (optional)
 * - actor_pk_hash: string (optional)
 * - verify: boolean (default false) - 验证哈希链
 *
 * 响应：
 * { entries: AuditEntry[], total: number, chain_valid?: boolean }
 */
export function createAuditHandler(ctx: AuditContext) {
    return (req: Request, res: Response): void => {
        try {
            const limit = parseInt((req.query.limit as string) || '100', 10);
            const event_type = req.query.event_type as string | undefined;
            const actor_pk_hash = req.query.actor_pk_hash as string | undefined;
            const verify = req.query.verify === 'true';

            let entries = ctx.audit_log.getAll();

            // 过滤
            if (event_type) {
                entries = entries.filter((e) => e.event_type === event_type);
            }
            if (actor_pk_hash) {
                entries = entries.filter((e) => e.actor_pk_hash === actor_pk_hash);
            }

            // 限制数量（取最新的）
            const total = entries.length;
            entries = entries.slice(-limit);

            const response: any = {
                entries,
                total,
            };

            // 可选：验证哈希链
            if (verify) {
                const chain_result = ctx.audit_log.verifyChain();
                response.chain_valid = chain_result.valid;
                if (!chain_result.valid) {
                    response.broken_at = chain_result.broken_at;
                }
            }

            res.status(200).json(response);
        } catch (err: any) {
            res.status(500).json({ reason: 'internal_error', error: err.message });
        }
    };
}
