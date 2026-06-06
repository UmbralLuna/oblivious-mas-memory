// src/crypto/poseidon.ts
// Poseidon 哈希函数（ZK 友好）
// 规范 v4.0 §4.1.1: 支持 1/2/3/4/5/6/8/9 个输入

import { buildPoseidon } from 'circomlibjs';

let poseidonInstance: any = null;

/**
 * 获取 Poseidon 实例（懒加载）
 */
export async function getPoseidon(): Promise<any> {
    if (!poseidonInstance) {
        poseidonInstance = await buildPoseidon();
    }
    return poseidonInstance;
}

/**
 * 通用 Poseidon 哈希
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
    if (inputs.length < 1 || inputs.length > 16) {
        throw new Error(`Poseidon input length must be 1-16, got ${inputs.length}`);
    }
    const poseidon = await getPoseidon();
    const hash = poseidon(inputs);
    return poseidon.F.toObject(hash);
}

/**
 * Poseidon 单输入
 */
export async function poseidon1(input: bigint): Promise<bigint> {
    return poseidonHash([input]);
}

/**
 * Poseidon 双输入
 */
export async function poseidon2(a: bigint, b: bigint): Promise<bigint> {
    return poseidonHash([a, b]);
}

/**
 * Poseidon 三输入
 */
export async function poseidon3(a: bigint, b: bigint, c: bigint): Promise<bigint> {
    return poseidonHash([a, b, c]);
}

/**
 * Poseidon 四输入
 */
export async function poseidon4(inputs: [bigint, bigint, bigint, bigint]): Promise<bigint> {
    return poseidonHash(inputs);
}

/**
 * Poseidon 五输入
 */
export async function poseidon5(inputs: [bigint, bigint, bigint, bigint, bigint]): Promise<bigint> {
    return poseidonHash(inputs);
}

/**
 * Poseidon 六输入
 */
export async function poseidon6(inputs: bigint[]): Promise<bigint> {
    if (inputs.length !== 6) throw new Error('poseidon6 requires exactly 6 inputs');
    return poseidonHash(inputs);
}

/**
 * Poseidon 八输入（用于 Capability 哈希）
 * 对应规范 v4.0 §4.1.1 HashCapability
 */
export async function poseidon8(inputs: bigint[]): Promise<bigint> {
    if (inputs.length !== 8) throw new Error('poseidon8 requires exactly 8 inputs');
    return poseidonHash(inputs);
}

/**
 * Poseidon 九输入（用于 CapabilityWithRandomness 哈希）
 * 对应规范 v4.0 §4.1.1 HashCapabilityWithRandomness
 */
export async function poseidon9(inputs: bigint[]): Promise<bigint> {
    if (inputs.length !== 9) throw new Error('poseidon9 requires exactly 9 inputs');
    return poseidonHash(inputs);
}

/**
 * 计算 Nullifier
 * nf = Poseidon(domain, sk, h_c)
 * domain: 0=delegate, 1=write
 */
export async function computeNullifier(domain: 0 | 1, sk: bigint, h_c: bigint): Promise<bigint> {
    return poseidon3(BigInt(domain), sk, h_c);
}

/**
 * 计算 Capability 哈希（8 字段）
 * 对应论文 Definition 1
 */
export interface CapabilityFields {
    iss: bigint;
    hld: bigint;
    scope_root: bigint;
    perm: bigint;
    depth: bigint;
    exp: bigint;
    attr_hash: bigint;
    tc_hash: bigint;
}

export async function hashCapability(cap: CapabilityFields): Promise<bigint> {
    return poseidon8([
        cap.iss,
        cap.hld,
        cap.scope_root,
        cap.perm,
        cap.depth,
        cap.exp,
        cap.attr_hash,
        cap.tc_hash,
    ]);
}

/**
 * 计算带随机数的 Capability 哈希（9 字段）
 */
export async function hashCapabilityWithRandomness(
    cap: CapabilityFields,
    randomness: bigint
): Promise<bigint> {
    return poseidon9([
        cap.iss,
        cap.hld,
        cap.scope_root,
        cap.perm,
        cap.depth,
        cap.exp,
        cap.attr_hash,
        cap.tc_hash,
        randomness,
    ]);
}

/**
 * 计算 TypeConstraint 哈希
 * 对应 tc_hash = Poseidon(tc_episodic, tc_semantic, tc_procedural)
 */
export async function hashTypeConstraint(
    episodic: number,
    semantic: number,
    procedural: number
): Promise<bigint> {
    return poseidon3(BigInt(episodic), BigInt(semantic), BigInt(procedural));
}

/**
 * 计算 Partition 叶子哈希
 * leaf = Poseidon(M, tau, tags, s)
 */
export async function hashPartitionLeaf(
    M: bigint,
    tau: number,
    tags: number,
    s: number
): Promise<bigint> {
    return poseidon4([M, BigInt(tau), BigInt(tags), BigInt(s)]);
}
