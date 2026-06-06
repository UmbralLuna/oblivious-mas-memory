// src/types/proof.ts

/**
 * Groth16 证明
 * 对应 snarkjs 的输出格式
 */
export interface Groth16Proof {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
    protocol: 'groth16';
    curve: 'bn128' | 'bls12381';
}

/**
 * 委托证明
 */
export interface DelegateProof {
    proof: Groth16Proof;
    publicSignals: string[];
}

/**
 * 写入证明
 */
export interface WriteProof {
    proof: Groth16Proof;
    publicSignals: string[];
}

/**
 * 证明结果（含时间统计）
 */
export interface ProofResult {
    proof: Groth16Proof;
    publicSignals: string[];
    timing: {
        /** Witness 生成时间 (ms) */
        witness_gen_ms: number;
        /** Prove 时间 (ms) */
        prove_ms: number;
        /** 总时间 (ms) */
        total_ms: number;
    };
}

/**
 * 验证结果
 */
export interface VerifyResult {
    valid: boolean;
    /** 验证时间 (ms) */
    verify_ms: number;
    /** 失败原因（如果 valid=false） */
    reason?: string;
}

/**
 * Pedersen 承诺
 */
export interface PedersenCommitment {
    /** 承诺点 (x, y) */
    C: [bigint, bigint];
    /** 隐藏的身份 */
    id_writer: bigint;
    /** 随机数（仅escrow知道） */
    r_pedersen: bigint;
}

/**
 * Nullifier 域
 */
export type NullifierDomain = 0 | 1; // 0=delegate, 1=write

/**
 * 委托电路公共输入
 */
export interface DelegatePublicInputs {
    h_c: string; // 子令牌哈希
    pk_issuer: [string, string]; // 发证者公钥
    nullifier: string; // Nullifier
    current_time: string; // 当前时间
}

/**
 * 写入电路公共输入
 */
export interface WritePublicInputs {
    h_w: string; // 写入请求哈希
    C_w: [string, string]; // Pedersen 承诺
    rt_scope: string; // Scope 根
    M_target: string; // 目标分区
    tau_target: string; // 目标类型
    pk_issuer: [string, string];
    nullifier_w: string;
    current_time: string;
}
