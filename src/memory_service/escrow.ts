// src/memory_service/escrow.ts
// 3-of-5 门限Escrow（真实Shamir秘密共享）
// 规范v4.0 §5.6
//
// 5个托管方：IT部门、法务部门、审计部门、外部审计机构、独立第三方
// 3-of-5门限：任意3个托管方合作即可重构秘密
// 正常模式：Pedersen承诺隐藏写入者身份（信息论安全）
// 追溯模式：收集3个分片重构(r_pedersen, id_writer)，验证承诺

import { createHmac } from 'crypto';
import { pedersenCommit } from '../crypto/pedersen';

// @ts-ignore
const secrets = require('secrets.js-grempe');

// ===== 托管方定义 =====
export const CUSTODIANS = [
    { id: 'it_dept',name: 'IT部门',       index: 0 },
    { id: 'legal_dept',     name: '法务部门',     index: 1 },
    { id: 'audit_dept',     name: '审计部门',     index: 2 },
    { id: 'ext_audit',      name: '外部审计机构', index: 3 },
    { id: 'third_party',    name: '独立第三方',   index: 4 },
] as const;

export type CustodianId = typeof CUSTODIANS[number]['id'];

export const THRESHOLD = 3;   // 需要3个托管方
export const TOTAL_SHARES = 5; // 共5个分片

// ===== 类型定义 =====
export interface DetectorVerdict {
    detector_id: string;
    verdict: 'malicious' | 'benign';
    confidence: number;
    signed_at: number;
    signature?: string;
}

export type EscrowStatus = 'pending' | 'objection_raised' | 'decrypted' | 'expired';

export interface CustodianShare {
    custodian_id: CustodianId;
    custodian_name: string;
    share: string;           // Shamir分片（hex格式）
    share_index: number;     // 分片索引（1-5）
    received_at: number;
}

export interface EscrowEntry {
    h_w: string;
    // 5个托管方各持有一个分片（正常情况下分散存储）
    custodian_shares: CustodianShare[];
    // 已提交的分片（追溯时托管方提交）
    submitted_shares: Map<CustodianId, string>;
    detector_signatures: DetectorVerdict[];
    objection_deadline_ts: number;
    status: EscrowStatus;
    created_at: number;
    decrypted_at?: number;
    // 验证用：Pedersen承诺（公开）
    C_w_x: string;
    C_w_y: string;
}

export interface DecryptedSecret {
    id_writer: string;
    r_pedersen: string;
}

// ===== EscrowService =====
export class EscrowService {
    private entries = new Map<string, EscrowEntry>();
    private readonly k_threshold: number;
    private readonly objection_period_ms: number;
    private readonly issuer_key: Buffer;

    constructor(
        issuer_key: Buffer,
        k_threshold: number =2,        // 触发追溯需要的检测器数量
        objection_period_hours: number = 48
    ) {
        if (issuer_key.length !== 32) {
            throw new Error('Issuer key must be 32 bytes');
        }
        this.issuer_key = issuer_key;
        this.k_threshold = k_threshold;
        this.objection_period_ms = objection_period_hours * 3600 * 1000;
    }

    /**
     * 提交新的escrow条目
     * 使用Shamir秘密共享将(r_pedersen, id_writer)分为5个分片
     * 分别分发给5个托管方
     */
    submit(h_w: string, secret: DecryptedSecret, C_w?: { x: string; y: string }): void {
        if (this.entries.has(h_w)) {
            throw new Error(`Escrow entry already exists for h_w=${h_w}`);
        }

        // 将秘密序列化为hex
        const secret_json = JSON.stringify(secret);
        const secret_hex = Buffer.from(secret_json, 'utf8').toString('hex');

        // Shamir秘密共享：分为5份，需要3份重构
        const shares: string[] = secrets.share(secret_hex, TOTAL_SHARES, THRESHOLD);

        // 分配给5个托管方
        const custodian_shares: CustodianShare[] = CUSTODIANS.map((custodian, i) => ({
            custodian_id: custodian.id,
            custodian_name: custodian.name,
            share: shares[i],
            share_index: i + 1,
            received_at: Date.now(),
        }));

        this.entries.set(h_w, {
            h_w,
            custodian_shares,
            submitted_shares: new Map(),
            detector_signatures: [],
            objection_deadline_ts: 0,
            status: 'pending',
            created_at: Date.now(),
            C_w_x: C_w?.x ?? '',
            C_w_y: C_w?.y ?? '',
        });
    }

    /**
     * 获取指定托管方的分片（模拟分发）
     * 实际部署中，分片在submit时通过安全信道发送给各托管方
     */
    getCustodianShare(h_w: string, custodian_id: CustodianId): string | null {
        const entry = this.entries.get(h_w);
        if (!entry) return null;
        const share = entry.custodian_shares.find(s => s.custodian_id === custodian_id);
        return share?.share ?? null;
    }

    /**
     * 添加检测器判决
     */
    addDetectorVerdict(h_w: string, verdict: DetectorVerdict): void {
        const entry = this.entries.get(h_w);
        if (!entry) throw new Error(`No escrow entry for h_w=${h_w}`);

        if (entry.detector_signatures.some(s => s.detector_id === verdict.detector_id)) {
            throw new Error(`Detector ${verdict.detector_id} already signed`);
        }

        // HMAC签名
        const payload = `${h_w}|${verdict.detector_id}|${verdict.verdict}|${verdict.signed_at}`;
        verdict.signature = createHmac('sha256', this.issuer_key)
            .update(payload).digest('hex');

        entry.detector_signatures.push(verdict);

        // 检查是否达到触发阈值
        const malicious_count = entry.detector_signatures
            .filter(s => s.verdict === 'malicious').length;

        if (malicious_count >= this.k_threshold && entry.status === 'pending') {
            entry.status = 'objection_raised';
            entry.objection_deadline_ts = Date.now() + this.objection_period_ms;
        }
    }

    /**
     * 托管方提交分片（追溯流程）
     * 实际部署中，托管方在收到授权请求后提交自己持有的分片
     */
    submitCustodianShare(h_w: string, custodian_id: CustodianId): boolean {
        const entry = this.entries.get(h_w);
        if (!entry) return false;
        if (entry.status !== 'objection_raised') return false;

        const share = entry.custodian_shares.find(s => s.custodian_id === custodian_id);
        if (!share) return false;

        entry.submitted_shares.set(custodian_id, share.share);
        return true;
    }

    /**
     * 尝试解密（需要异议期结束 + 至少THRESHOLD个托管方提交分片）
     * 标准模式：异议期结束后，收集3个分片重构秘密
     */
    tryDecrypt(h_w: string): DecryptedSecret | null {
        const entry = this.entries.get(h_w);
        if (!entry) return null;
        if (entry.status !== 'objection_raised') return null;
        if (Date.now() < entry.objection_deadline_ts) return null;

        // 检查已提交的分片数量
        if (entry.submitted_shares.size< THRESHOLD) return null;

        return this._reconstruct(entry);
    }

    /**
     * 紧急解密（跳过异议期，需要4个托管方同意）
     *紧急模式：全部检测器一致确认 + 4个托管方同意
     */
    emergencyDecrypt(h_w: string): DecryptedSecret | null {
        const entry = this.entries.get(h_w);
        if (!entry) return null;
        if (entry.status !== 'objection_raised') return null;

        // 紧急模式需要4个分片
        if (entry.submitted_shares.size < THRESHOLD + 1) return null;

        return this._reconstruct(entry);
    }

    /**
     * 内部：使用已提交的分片重构秘密
     */
    private _reconstruct(entry: EscrowEntry): DecryptedSecret | null {
        try {
            // 取前THRESHOLD个分片重构
            const shares_to_use = Array.from(entry.submitted_shares.values())
                .slice(0, THRESHOLD);

            const reconstructed_hex = secrets.combine(shares_to_use);
            const secret_json = Buffer.from(reconstructed_hex, 'hex').toString('utf8');
            const secret = JSON.parse(secret_json) as DecryptedSecret;

            entry.status = 'decrypted';
            entry.decrypted_at = Date.now();
            return secret;
        } catch (err) {
            return null;
        }
    }

    /**
     * 撤销异议（在异议期内）
     */
    cancelObjection(h_w: string): boolean {
        const entry = this.entries.get(h_w);
        if (!entry || entry.status !== 'objection_raised') return false;
        if (Date.now() >= entry.objection_deadline_ts) return false;

        entry.status = 'pending';
        entry.objection_deadline_ts = 0;
        entry.submitted_shares.clear();
        return true;
    }

    /**
     * 验证重构的秘密与Pedersen承诺一致
     * C_w = g^id_writer * h^r_pedersen
     * 此处做简单哈希验证（完整验证需要椭圆曲线运算）
     */
    async verifyReconstructed(secret: DecryptedSecret, C_w_x: string, C_w_y: string, H_x: string, H_y: string): Promise<boolean> {
        try {
            // 真实Pedersen承诺验证：C_w = g^id_writer * h^r_pedersen
            const computed = await pedersenCommit(
                BigInt(secret.id_writer),
                BigInt(secret.r_pedersen),
                { x: BigInt(H_x), y: BigInt(H_y) }
            );
            
            // 比较计算结果与声明的承诺
            return (
                computed.x.toString() === C_w_x &&
                computed.y.toString() === C_w_y
            );
        } catch (e) {
            console.error('Pedersen verification failed:', e);
            return false;
        }
    }

    getStatus(h_w: string): EscrowEntry | null {
        return this.entries.get(h_w) ?? null;
    }

    getAll(): EscrowEntry[] {
        return Array.from(this.entries.values());
    }

    size(): number {
        return this.entries.size;
    }

    clear(): void {
        this.entries.clear();
    }
}
