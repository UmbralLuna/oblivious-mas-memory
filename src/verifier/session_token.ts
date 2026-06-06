// src/verifier/session_token.ts
// Session Token 签发与验证
// 规范 v4.0 §5.4

import { createHmac, randomBytes } from 'crypto';
import type { SessionToken } from '../prover/types';

export class SessionTokenManager {
    private secret: Buffer;
    private ttlSeconds: number;

    /**
     * @param secret HMAC 密钥（32 字节）
     * @param ttlSeconds Token 有效期（默认 300 秒 = 5 分钟）
     */
    constructor(secret: Buffer, ttlSeconds: number = 300) {
        if (secret.length !== 32) {
            throw new Error('Secret must be 32 bytes');
        }
        this.secret = secret;
        this.ttlSeconds = ttlSeconds;
    }

    /**
     * 签发 Session Token
     */
    issue(h_c: string, scope_hash: string, agent_pk_hash: string): SessionToken {
        const sid = randomBytes(16).toString('hex');
        const issued_at = Math.floor(Date.now() / 1000);
        const exp = issued_at + this.ttlSeconds;

        const payload = `${sid}|${h_c}|${scope_hash}|${agent_pk_hash}|${issued_at}|${exp}`;
        const mac = createHmac('sha256', this.secret).update(payload).digest('hex');

        return {
            sid,
            h_c,
            scope_hash,
            agent_pk_hash,
            issued_at,
            exp,
            mac,
        };
    }

    /**
     * 验证 Session Token
     */
    verify(
        stk: SessionToken,
        scope_hash_required: string,
        agent_pk_hash: string
    ): { valid: boolean; reason?: string } {
        const now = Math.floor(Date.now() / 1000);

        // 检查过期
        if (now > stk.exp) {
            return { valid: false, reason: 'expired' };
        }

        // 检查 scope 匹配
        if (stk.scope_hash !== scope_hash_required) {
            return { valid: false, reason: 'scope_mismatch' };
        }

        // 检查 agent 匹配
        if (stk.agent_pk_hash !== agent_pk_hash) {
            return { valid: false, reason: 'agent_mismatch' };
        }

        // 验证 MAC
        const payload = `${stk.sid}|${stk.h_c}|${stk.scope_hash}|${stk.agent_pk_hash}|${stk.issued_at}|${stk.exp}`;
        const expected_mac = createHmac('sha256', this.secret).update(payload).digest('hex');

        if (expected_mac !== stk.mac) {
            return { valid: false, reason: 'mac_invalid' };
        }

        return { valid: true };
    }

    /**
     * 刷新 Token（延长有效期）
     */
    refresh(stk: SessionToken): SessionToken {
        const verify_result = this.verify(stk, stk.scope_hash, stk.agent_pk_hash);
        if (!verify_result.valid) {
            throw new Error(`Cannot refresh invalid token: ${verify_result.reason}`);
        }

        return this.issue(stk.h_c, stk.scope_hash, stk.agent_pk_hash);
    }
}
