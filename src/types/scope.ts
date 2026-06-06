// src/types/scope.ts

/**
 * 记忆类型
 * 对应论文 §2.1.2: 三层记忆分类（MemoryScope）
 */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

export const MemoryTypeEnum = {
    episodic: 0, // 情景记忆（默认敏感度 [0.7, 1.0]）
    semantic: 1, // 语义记忆（默认敏感度 [0.3, 0.7]）
    procedural: 2, // 程序记忆（默认敏感度 [0.0, 0.3]）
} as const;

/**
 * 内容标签集合 L
 * 对应论文 §2.1.2: |L| = 5 位位向量
 */
export interface ContentTags {
    /** bit 0: 商业机密 → s ≥ 0.8 */
    commercial_secret: boolean;

    /** bit 1: 已匿名化 → 允许降低至 s ≥ 0.2 */
    anonymized: boolean;

    /** bit 2: 公开知识 → 允许降低至 s ≥ 0.1 */
    public_knowledge: boolean;

    /** bit 3: 含个人信息 → s ≥ 0.9 */
    pii_contained: boolean;

    /** bit 4: 已脱敏（用于 R2 跨组织 episodic 传播） */
    sanitized: boolean;
}

/**
 * 编码内容标签为 5 位位向量
 */
export function encodeContentTags(tags: ContentTags): number {
    return (
        (tags.commercial_secret ? 1 : 0) |
        (tags.anonymized ? 2 : 0) |
        (tags.public_knowledge ? 4 : 0) |
        (tags.pii_contained ? 8 : 0) |
        (tags.sanitized ? 16 : 0)
    );
}

/**
 * 解码位向量为内容标签
 */
export function decodeContentTags(encoded: number): ContentTags {
    return {
        commercial_secret: (encoded & 1) !== 0,
        anonymized: (encoded & 2) !== 0,
        public_knowledge: (encoded & 4) !== 0,
        pii_contained: (encoded & 8) !== 0,
        sanitized: (encoded & 16) !== 0,
    };
}

/**
 * 分区（Partition）
 * 对应论文 Definition 2: scope = {(M_i, τ_i, tags_i, s_i)}
 */
export interface Partition {
    /** 分区标识符 */
    M: bigint;

    /** 记忆类型 */
    tau: MemoryType;

    /** 内容标签 */
    tags: ContentTags;

    /** 敏感度 [0, 255]（8 位量化，对应 [0, 1.0]） */
    s: number;
}

/**
 * Scope（结构化授权范围）
 */
export interface Scope {
    /** 分区列表 */
    partitions: Partition[];

    /** Merkle 树根 */
    merkle_root: bigint;
}

/**
 * 计算敏感度的最低下界（来自类型默认 + 标签约束）
 * 对应论文 §4.2.7: G5 约束
 */
export function getSensitivityFloor(tau: MemoryType, tags: ContentTags): number {
    // 类型默认下界（8-bit 量化）
    const typeFloors: Record<MemoryType, number> = {
        episodic: 179, // 0.7 * 255
        semantic: 77, // 0.3 * 255
        procedural: 0, // 0.0
    };

    let floor = typeFloors[tau];

    // 标签约束（取最大值）
    if (tags.commercial_secret) floor = Math.max(floor, 204); // 0.8 * 255
    if (tags.pii_contained) floor = Math.max(floor, 230); // 0.9 * 255

    return floor;
}

/**
 * 验证敏感度是否满足下界
 */
export function isSensitivityValid(partition: Partition): boolean {
    const floor = getSensitivityFloor(partition.tau, partition.tags);
    return partition.s >= floor;
}

/**
 * 部门枚举
 */
export type Department = 'rd' | 'finance' | 'legal' | 'marketing' | 'ops' | 'all';

/**
 * 检查跨组织 episodic 传播规则（R2）
 */
export function isCrossOrgEpisodicValid(
    parentDept: Department,
    childDept: Department,
    partition: Partition
): boolean {
    // 同组织：无限制
    if (parentDept === childDept) return true;

    // 跨组织：episodic 必须 sanitized
    if (partition.tau === 'episodic') {
        return partition.tags.sanitized;
    }

    // 其他类型：允许跨组织
    return true;
}
