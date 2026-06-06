// src/memory_service/server.ts
// Express HTTP 服务器主入口
// 规范 v4.0 §5.5

import express, { type Application } from 'express';
import { randomBytes } from 'crypto';
import { NullifierSet } from '../verifier/nullifier_set';
import { RevokeList } from '../verifier/revoke_list';
import { SessionTokenManager } from '../verifier/session_token';
import { PartitionStorage } from './storage';
import { AuditLog } from './audit_log';
import { EscrowService } from './escrow';
import { TrustScoreManager } from './trust_score';
import { createDelegateHandler } from './routes/delegate';
import { createAccessHandler } from './routes/access';
import { createWriteHandler } from './routes/write';
import { createAuditHandler } from './routes/audit';

/**
 * 服务器配置
 */
export interface ServerConfig {
    port: number;
    nullifier_db_path: string;
    storage_db_path: string;
    delegate_vkey_path: string;
    write_vkey_path: string;
    session_secret?: Buffer;
    issuer_key?: Buffer;
    session_ttl_seconds?: number;
    escrow_k_threshold?: number;
    escrow_objection_hours?: number;
}

/**
 * 创建应用（不启动）
 */
export function createApp(config: ServerConfig): {
    app: Application;
    nullifier_set: NullifierSet;
    storage: PartitionStorage;
    session_manager: SessionTokenManager;
    revoke_list: RevokeList;
    audit_log: AuditLog;
    escrow: EscrowService;
    trust: TrustScoreManager;
    close: () => void;
} {
    const app = express();
    app.use(express.json({ limit: '10mb' }));

    // 初始化核心组件
    const nullifier_set = new NullifierSet(config.nullifier_db_path);
    const storage = new PartitionStorage(config.storage_db_path);
    const revoke_list = new RevokeList();
    const audit_log = new AuditLog();

    const session_secret = config.session_secret ?? randomBytes(32);
    const session_manager = new SessionTokenManager(
        session_secret,
        config.session_ttl_seconds ?? 300
    );

    const issuer_key = config.issuer_key ?? randomBytes(32);
    const escrow = new EscrowService(
        issuer_key,
        config.escrow_k_threshold ?? 2,
        config.escrow_objection_hours ?? 48
    );

    const trust = new TrustScoreManager();

    // 注册路由
    app.post(
        '/verify-delegate',
        createDelegateHandler({
            nullifier_set,
            revoke_list,
            session_manager,
            audit_log,
            delegate_vkey_path: config.delegate_vkey_path,
        })
    );

    app.post(
        '/access',
        createAccessHandler({
            session_manager,
            storage,
            audit_log,
        })
    );

    app.post(
        '/write',
        createWriteHandler({
            nullifier_set,
            storage,
            audit_log,
            escrow,
            trust,
            write_vkey_path: config.write_vkey_path,
        })
    );

    app.get('/audit-log', createAuditHandler({ audit_log }));

    // 健康检查
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            nullifier_count: nullifier_set.count(),
            storage_count: storage.count(),
            audit_size: audit_log.size(),
            trust_size: trust.size(),
        });
    });

    const close = (): void => {
        nullifier_set.close();
        storage.close();
    };

    return {
        app,
        nullifier_set,
        storage,
        session_manager,
        revoke_list,
        audit_log,
        escrow,
        trust,
        close,
    };
}

/**
 * 启动服务器
 */
export function startServer(config: ServerConfig): Promise<{
    close: () => Promise<void>;
}> {
    return new Promise((resolve) => {
        const { app, close: closeComponents } = createApp(config);

        const server = app.listen(config.port, () => {
            console.info(`Memory service listening on port ${config.port}`);
            resolve({
                close: () =>
                    new Promise<void>((resolveClose) => {
                        server.close(() => {
                            closeComponents();
                            resolveClose();
                        });
                    }),
            });
        });
    });
}
