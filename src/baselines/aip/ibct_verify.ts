// src/baselines/aip/ibct_verify.ts
// 复现 AIP (Prakash, 2026) IBCT 验签逻辑
// 规范 v4.0 §6.2

import { createHash } from 'crypto';
import { verify as eddsaVerify } from '../../crypto/eddsa';
import { HighResTimer } from '../../utils/timer';

/**
 * Invocation-Bound Capability Token
 */
export interface IBCT {
    scope: string[]; // 扁平资源列表
    permissions: ('read' | 'write' | 'delete')[];
    expiration: number; // Unix 时间戳
    issuer_pk: [bigint, bigint];
    signature: { R8x: bigint; R8y: bigint; S: bigint };
}

export interface AIPVerifyResult {
    valid: boolean;
    reason?: string;
    verify_ms: number;
}

/**
 * AIP 验证器
 *
 * 核心逻辑：
 * 1. 检查过期时间
 * 2. 检查权限
 * 3. 验证 EdDSA 签名
 */
export class AIPVerifier {
    /**
     * 验证 IBCT
     */
    async verify(
        token: IBCT,
        required_resource: string,
        required_operation: 'read' | 'write' | 'delete',
        current_time: number
    ): Promise<AIPVerifyResult> {
        const timer = new HighResTimer();
        timer.start();

        // 1. 过期检查
        if (current_time >= token.expiration) {
            return {
                valid: false,
                reason: 'expired',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        // 2. Scope 检查（明文匹配）
        if (!token.scope.includes(required_resource)) {
            return {
                valid: false,
                reason: 'resource_not_in_scope',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        // 3. 权限检查
        if (!token.permissions.includes(required_operation)) {
            return {
                valid: false,
                reason: 'operation_not_allowed',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        // 4. 计算消息哈希
        const msg = this.computeMessage(token);

        // 5. EdDSA 验证
        const sig_valid = await eddsaVerify(token.issuer_pk, msg, token.signature);

        if (!sig_valid) {
            return {
                valid: false,
                reason: 'invalid_signature',
                verify_ms: Number(timer.stop()) / 1e6,
            };
        }

        return {
            valid: true,
            verify_ms: Number(timer.stop()) / 1e6,
        };
    }

    /**
     * 计算消息哈希（用于签名/验签）
     */
    private computeMessage(token: IBCT): bigint {
        // Hash 所有字段为消息
        const content = JSON.stringify({
            scope: token.scope,
            permissions: token.permissions,
            expiration: token.expiration,
        });
        const hash = createHash('sha256').update(content).digest();
        // 取前 16 字节转为 bigint（确保在 BabyJubJub 标量域内）
        return BigInt('0x' + hash.toString('hex').slice(0, 32));
    }

    /**
     * 计算消息哈希（供签名用）
     */
    static computeMessageHash(scope: string[], permissions: string[], expiration: number): bigint {
        const content = JSON.stringify({ scope, permissions, expiration });
        const hash = createHash('sha256').update(content).digest();
        return BigInt('0x' + hash.toString('hex').slice(0, 32));
    }
}
