// src/prover/types.ts
// 协议层类型定义
// 规范 v4.0 §5

import type { Point } from '../crypto/babyjub';

/**
 * 记忆类型
 */
export enum MemoryType {
    Episodic = 0,
    Semantic = 1,
    Procedural = 2,
}

/**
 * 类型约束策略
 */
export enum TypeConstraintPolicy {
    Deny = 0,
    Restrict = 1,
    Allow = 2,
}

/**
 * 类型约束（3 种记忆类型的策略）
 */
export interface TypeConstraint {
    episodic: TypeConstraintPolicy;
    semantic: TypeConstraintPolicy;
    procedural: TypeConstraintPolicy;
}

/**
 * 内容标签（5 位二进制）
 */
export interface ContentTags {
    commercial_secret: boolean; // bit 0
    internal_only: boolean; // bit 1
    public_safe: boolean; // bit 2
    pii_contained: boolean; // bit 3
    sanitized: boolean; // bit 4
}

/**
 * Scope 分区
 */
export interface Partition {
    M: bigint; // 分区标识符
    tau: MemoryType; // 记忆类型
    tags: number; // 5-bit 标签（0-31）
    s: number; // 敏感度（0-255）
}

/**
 * Scope（Merkle 树）
 */
export interface Scope {
    root: bigint; // Merkle 根
    partitions: Partition[]; // 叶子节点
}

/**
 * 能力令牌
 */
export interface Capability {
    iss: bigint; // 发证者 ID
    hld: bigint; // 持有者 ID
    scope: Scope; // 授权范围
    perm: number; // 权限位（32-bit）
    depth: number; // 委托深度
    exp: number; // 过期时间戳
    attr_hash: bigint; // 属性哈希
    tc: TypeConstraint; // 类型约束
}

/**
 * EdDSA 签名
 */
export interface EdDSASignature {
    R8x: bigint;
    R8y: bigint;
    S: bigint;
}

/**
 * 委托证明输入
 */
export interface DelegateWitnessInput {
    // 公共输入
    h_c: string;
    pk_issuer: [string, string];
    nullifier: string;
    current_time: string;

    // 私有输入：父令牌
    parent_iss: string;
    parent_hld: string;
    parent_scope_root: string;
    parent_perm: string;
    parent_depth: string;
    parent_exp: string;
    parent_attr_hash: string;
    parent_tc_hash: string;
    parent_tc: [string, string, string];

    // 私有输入：子令牌
    child_iss: string;
    child_hld: string;
    child_scope_root: string;
    child_perm: string;
    child_depth: string;
    child_exp: string;
    child_attr_hash: string;
    child_tc_hash: string;
    child_tc: [string, string, string];
    randomness: string;

    // 私有输入：签名
    sig_R8x: string;
    sig_R8y: string;
    sig_S: string;

    // 私有输入：持有者
    holder_sk: string;
    holder_pk_x: string;
    holder_pk_y: string;

    // 私有输入：子 scope 分区
    partition_M: string[];
    partition_tau: string[];
    partition_tags: string[];
    partition_s: string[];
    partition_is_active: string[];

    // 私有输入：Merkle 路径
    merkle_paths: string[][];
    merkle_indices: string[][];

    // 私有输入：R3 相关
    k_amplification: string;
    depth_parent_partition: string[];
    depth_child_partition: string[];
}

/**
 * 写入证明输入
 */
export interface WriteWitnessInput {
    // 公共输入
    h_w: string;
    C_w: [string, string];
    rt_scope: string;
    M_target: string;
    tau_target: string;
    pk_issuer: [string, string];
    nullifier_w: string;
    current_time: string;

    // 私有输入：能力令牌
    cap_iss: string;
    cap_hld: string;
    cap_scope_root: string;
    cap_perm: string;
    cap_depth: string;
    cap_exp: string;
    cap_attr_hash: string;
    cap_tc_hash: string;
    cap_tc: [string, string, string];

    // 私有输入：签名
    sig_R8x: string;
    sig_R8y: string;
    sig_S: string;

    // 私有输入：目标分区
    target_tags: string;
    target_s: string;
    merkle_path: string[];
    merkle_index: string[];

    // 私有输入：Pedersen
    id_writer: string;
    r_pedersen: string;
    H_x: string;
    H_y: string;

    // 私有输入：持有者
    holder_sk: string;
    holder_pk_x: string;
    holder_pk_y: string;
    randomness_h: string;
    // 私有输入：W7 脱敏验证
    cross_org: string;
    original_len: string;
    sanitized_len: string;
    H_original: string;
    H_sanitized: string;
    pii_flags: string;
}

/**
 * 证明结果
 */
export interface ProofResult {
    proof: any;
    publicSignals: string[];
    timing: {
        witness_gen_ms?: number;
        prove_ms?: number;
        total_ms: number;
    };
}

/**
 * 验证结果
 */
export interface VerifyResult {
    valid: boolean;
    verify_ms: number;
    reason?: string;
}

/**
 * Pedersen 承诺
 */
export interface PedersenCommitment {
    C: Point;
    id: bigint;
    r: bigint;
}

/**
 * Session Token
 */
export interface SessionToken {
    sid: string;
    h_c: string;
    scope_hash: string;
    agent_pk_hash: string;
    issued_at: number;
    exp: number;
    mac: string;
}

/**
 * 工具函数：ContentTags → number
 */
export function tagsToNumber(tags: ContentTags): number {
    return (
        (tags.commercial_secret ? 1 : 0) |
        (tags.internal_only ? 2 : 0) |
        (tags.public_safe ? 4 : 0) |
        (tags.pii_contained ? 8 : 0) |
        (tags.sanitized ? 16 : 0)
    );
}

/**
 * 工具函数：number → ContentTags
 */
export function numberToTags(n: number): ContentTags {
    return {
        commercial_secret: (n & 1) !== 0,
        internal_only: (n & 2) !== 0,
        public_safe: (n & 4) !== 0,
        pii_contained: (n & 8) !== 0,
        sanitized: (n & 16) !== 0,
    };
}

/**
 * 工具函数：TypeConstraint → [bigint, bigint, bigint]
 */
export function tcToArray(tc: TypeConstraint): [bigint, bigint, bigint] {
    return [BigInt(tc.episodic), BigInt(tc.semantic), BigInt(tc.procedural)];
}
