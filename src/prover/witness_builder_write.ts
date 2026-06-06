// src/prover/witness_builder_write.ts
// 写入证明 witness 构建器
// 规范 v4.0 §5.1
import { poseidon2, poseidon3, poseidon5, computeNullifier } from '../crypto/poseidon';
import { pedersenCommit } from '../crypto/pedersen';
import { derivePublicKey } from '../crypto/babyjub';
import type { Capability, WriteWitnessInput } from './types';
import { tcToArray } from './types';

/**
 * W7 脱敏参数
 * S1: sanitized_len <= 0.8 * original_len  =>  5*sanitized_len <= 4*original_len
 * S2: H_sanitized <= 0.6 * H_original      =>  5*H_sanitized <= 3*H_original
 * S3: pii_flags == 0 (无PII模式)
 */
export interface SanitizeParams {
    cross_org: number;       // 是否跨部门（0/1）
    original_len: number;    // 原始文本长度（8位量化，0-255）
    sanitized_len: number;   // 脱敏后文本长度（8位量化，0-255）
    H_original: number;      // 原始文本熵（8位量化，0-255）
    H_sanitized: number;     // 脱敏后文本熵（8位量化，0-255）
    pii_flags: number;       // PII模式标志（4位，0=无PII）
}

/**
 * 计算脱敏参数（从实际文本内容推导）
 * @param original_text 原始文本
 * @param sanitized_text 脱敏后文本
 * @param cross_org 是否跨部门
 */
export function computeSanitizeParams(
    original_text: string,
    sanitized_text: string,
    cross_org: boolean
): SanitizeParams {
    // S1: 长度量化到0-255
    const original_len = Math.min(255, Math.floor(original_text.length / 4));
    const sanitized_len = Math.min(255, Math.floor(sanitized_text.length / 4));

    // S2: 熵计算（字符频率Shannon熵，量化到0-255）
    function calcEntropy(text: string): number {
        if (text.length === 0) return 0;
        const freq: Record<string, number> = {};
        for (const c of text) freq[c] = (freq[c] || 0) + 1;
        let entropy = 0;
        for (const count of Object.values(freq)) {
            const p = count / text.length;
            entropy -= p * Math.log2(p);
        }
        // 量化到0-255（最大熵约8bits）
        return Math.min(255, Math.floor(entropy * 32));
    }
    const H_original = calcEntropy(original_text);
    const H_sanitized = calcEntropy(sanitized_text);

    // S3: PII模式检测
    // bit0=email, bit1=phone, bit2=timestamp, bit3=amount
    let pii_flags = 0;
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(sanitized_text)) pii_flags |= 1;
    if (/1[3-9]\d{9}|(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/.test(sanitized_text)) pii_flags |= 2;
    if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}:\d{2}:\d{2}/.test(sanitized_text)) pii_flags |= 4;
    if (/\d+(\.\d+)?(万|亿|元|USD|CNY|RMB)|\$\d+/.test(sanitized_text)) pii_flags |= 8;

    return {
        cross_org: cross_org ? 1 : 0,
        original_len,
        sanitized_len,
        H_original,
        H_sanitized,
        pii_flags,
    };
}

/**
 * 验证脱敏参数是否满足S1-S3约束（链下预检查）
 */
export function validateSanitizeParams(params: SanitizeParams): {
    valid: boolean;
    s1: boolean;
    s2: boolean;
    s3: boolean;reason?: string;
} {
    //仅对跨部门情景记忆验证
    if (!params.cross_org) {
        return { valid: true, s1: true, s2: true, s3: true };
    }

    // S1: 5* sanitized_len <= 4 * original_len
    const s1 = 5 * params.sanitized_len <= 4 * params.original_len;

    // S2: 5 * H_sanitized <= 3 * H_original
    const s2 = 5 * params.H_sanitized <= 3 * params.H_original;

    // S3: pii_flags == 0
    const s3 = params.pii_flags === 0;

    const valid = s1 && s2 && s3;
    const reasons: string[] = [];
    if (!s1) reasons.push(`S1失败: 5*${params.sanitized_len} > 4*${params.original_len}`);
    if (!s2) reasons.push(`S2失败: 5*${params.H_sanitized} > 3*${params.H_original}`);
    if (!s3) reasons.push(`S3失败: pii_flags=${params.pii_flags} != 0`);

    return { valid, s1, s2, s3, reason: reasons.join('; ') };
}

/**
 * 构建写入证明的 witness 输入（含W7脱敏验证）
 */
export async function buildWriteWitness(
    cap: Capability,
    sig: { R8x: bigint; R8y: bigint; S: bigint },
    M_target: bigint,
    tau_target: number,
    target_tags: number,
    target_s: number,
    merkle_path: bigint[],
    merkle_index: number[],
    holder_sk: bigint,
    id_writer: bigint,
    r_pedersen: bigint,
    H: { x: bigint; y: bigint },
    randomness_h: bigint,
    current_time: number,
    issuer_pk: { x: bigint; y: bigint },
    sanitize: SanitizeParams = {
        cross_org: 0,
        original_len: 200,
        sanitized_len: 100,
        H_original: 200,
        H_sanitized: 80,
        pii_flags: 0,
    }
): Promise<WriteWitnessInput> {
    // 链下预检查W7约束
    const w7_check = validateSanitizeParams(sanitize);
    if (!w7_check.valid) {
        throw new Error(`W7脱敏验证失败: ${w7_check.reason}`);
    }

    // 计算 tc_hash
    const tc_array = tcToArray(cap.tc);
    const cap_tc_hash = await poseidon3(tc_array[0], tc_array[1], tc_array[2]);

    // 计算 Pedersen 承诺
    const C_w = await pedersenCommit(id_writer, r_pedersen, H);

    // 计算 h_w
    const h_w = await poseidon5([M_target, BigInt(tau_target), C_w.x, C_w.y, randomness_h]);

    // 计算 nullifier_w
    const nullifier_w = await computeNullifier(1, holder_sk, h_w);

    // 派生持有者公钥
    const holder_pk = await derivePublicKey(holder_sk);

    // 验证 cap.hld = Poseidon(holder_pk)
    const expected_hld = await poseidon2(holder_pk.x, holder_pk.y);
    if (expected_hld !== cap.hld) {
        throw new Error('cap.hld mismatch');
    }

    // 验证 id_writer = Poseidon(holder_pk)
    if (id_writer !== expected_hld) {
        throw new Error('id_writer must equal Poseidon(holder_pk)');
    }

    // 使用真实发证者公钥
    const pk_issuer_x = issuer_pk.x;
    const pk_issuer_y = issuer_pk.y;

    // 填充 Merkle 路径到 d_s=6
    const d_s = 6;
    const merkle_path_str: string[] = [];
    const merkle_index_str: string[] = [];
    for (let i = 0; i < d_s; i++) {
        merkle_path_str.push(i < merkle_path.length ? merkle_path[i].toString() : '0');
        merkle_index_str.push(i < merkle_index.length ? merkle_index[i].toString() : '0');
    }

    return {
        h_w: h_w.toString(),
        C_w: [C_w.x.toString(), C_w.y.toString()],
        rt_scope: cap.scope.root.toString(),
        M_target: M_target.toString(),
        tau_target: tau_target.toString(),
        pk_issuer: [pk_issuer_x.toString(), pk_issuer_y.toString()],
        nullifier_w: nullifier_w.toString(),
        current_time: current_time.toString(),
        cap_iss: cap.iss.toString(),
        cap_hld: cap.hld.toString(),
        cap_scope_root: cap.scope.root.toString(),
        cap_perm: cap.perm.toString(),
        cap_depth: cap.depth.toString(),
        cap_exp: cap.exp.toString(),
        cap_attr_hash: cap.attr_hash.toString(),
        cap_tc_hash: cap_tc_hash.toString(),
        cap_tc: [tc_array[0].toString(), tc_array[1].toString(), tc_array[2].toString()],
        sig_R8x: sig.R8x.toString(),
        sig_R8y: sig.R8y.toString(),
        sig_S: sig.S.toString(),
        target_tags: target_tags.toString(),
        target_s: target_s.toString(),
        merkle_path: merkle_path_str,
        merkle_index: merkle_index_str,
        id_writer: id_writer.toString(),
        r_pedersen: r_pedersen.toString(),
        H_x: H.x.toString(),
        H_y: H.y.toString(),
        holder_sk: holder_sk.toString(),
        holder_pk_x: holder_pk.x.toString(),
        holder_pk_y: holder_pk.y.toString(),
        randomness_h: randomness_h.toString(),// W7 脱敏验证输入
        cross_org: sanitize.cross_org.toString(),
        original_len: sanitize.original_len.toString(),
        sanitized_len: sanitize.sanitized_len.toString(),
        H_original: sanitize.H_original.toString(),
        H_sanitized: sanitize.H_sanitized.toString(),
        pii_flags: sanitize.pii_flags.toString(),
    };
}
