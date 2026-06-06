// src/types/capability.ts

/**
 * 能力令牌（Capability Token）
 * 对应论文 Definition 1: cap = (iss, hld, scope_root, perm, depth, exp, attr_hash, tc_hash)
 */
export interface Capability {
    /** 发证者公钥哈希 (Poseidon hash) */
    iss: bigint;

    /** 持有者公钥哈希 (Poseidon hash) */
    hld: bigint;

    /** Scope Merkle 树根 */
    scope_root: bigint;

    /** 权限位向量 (32-bit) */
    perm: number;

    /** 委托深度限制 (8-bit, max 255) */
    depth: number;

    /** 过期时间戳 (Unix epoch, 64-bit) */
    exp: bigint;

    /** 属性哈希 (Poseidon hash of attributes) */
    attr_hash: bigint;

    /** 类型约束哈希 (Poseidon hash of tc[3]) */
    tc_hash: bigint;
}

/**
 * 类型约束（Type Constraint）
 * 对应论文 Definition 4: 三种记忆类型的访问策略
 * 0=deny, 1=restrict, 2=allow
 */
export interface TypeConstraint {
    /** 情景记忆策略 */
    episodic: 0 | 1 | 2;
    /** 语义记忆策略 */
    semantic: 0 | 1 | 2;
    /** 程序记忆策略 */
    procedural: 0 | 1 | 2;
}

/**
 * 已签名的能力令牌
 */
export interface SignedCapability {
    cap: Capability;
    /** EdDSA 签名 */
    signature: {
        R8x: bigint;
        R8y: bigint;
        S: bigint;
    };
    /** 签名时使用的发证者公钥 */
    issuer_pubkey: [bigint, bigint];
}

/**
 * 权限位定义
 */
export const PermissionBits = {
    READ: 1 << 0, // bit 0
    WRITE: 1 << 1, // bit 1
    DELEGATE: 1 << 2, // bit 2
    REVOKE: 1 << 3, // bit 3
    AUDIT: 1 << 4, // bit 4
} as const;

export type PermissionBit = (typeof PermissionBits)[keyof typeof PermissionBits];

/**
 * 检查权限
 */
export function hasPermission(perm: number, bit: PermissionBit): boolean {
    return (perm & bit) !== 0;
}

/**
 * 设置权限
 */
export function setPermission(perm: number, bit: PermissionBit): number {
    return perm | bit;
}

/**
 * 委托降级规则的偏序：deny < restrict < allow
 */
export function isPolicyTighter(child: 0 | 1 | 2, parent: 0 | 1 | 2): boolean {
    return child <= parent;
}

/**
 * 验证 TypeConstraint 是父令牌的合法收紧
 */
export function isTypeConstraintValid(child: TypeConstraint, parent: TypeConstraint): boolean {
    return (
        isPolicyTighter(child.episodic, parent.episodic) &&
        isPolicyTighter(child.semantic, parent.semantic) &&
        isPolicyTighter(child.procedural, parent.procedural)
    );
}
