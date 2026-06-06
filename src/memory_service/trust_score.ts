// src/memory_service/trust_score.ts
// EWMA（指数加权移动平均）信任度
// 规范 v4.0 §5.5

/**
 * 信任度事件
 */
export interface TrustEvent {
    actor_pk_hash: string;
    event_type: 'good' | 'bad';
    magnitude: number; // 事件强度 [0, 1]
    timestamp: number;
}

/**
 * 信任度记录
 */
export interface TrustRecord {
    actor_pk_hash: string;
    score: number; // 当前信任度 [0, 1]
    event_count: number;
    last_updated: number;
}

/**
 * EWMA 信任度管理器
 */
export class TrustScoreManager {
    private scores = new Map<string, TrustRecord>();
    private readonly alpha: number; // EWMA 平滑系数
    private readonly initial_score: number; // 初始信任度

    /**
     * @param alpha EWMA 平滑系数（默认 0.1，较平滑）
     * @param initial_score 新 actor 的初始信任度（默认 0.5）
     */
    constructor(alpha: number = 0.1, initial_score: number = 0.5) {
        if (alpha <= 0 || alpha >= 1) {
            throw new Error('alpha must be in (0, 1)');
        }
        if (initial_score < 0 || initial_score > 1) {
            throw new Error('initial_score must be in [0, 1]');
        }
        this.alpha = alpha;
        this.initial_score = initial_score;
    }

    /**
     * 记录事件并更新信任度
     */
    record(event: TrustEvent): number {
        if (event.magnitude < 0 || event.magnitude > 1) {
            throw new Error('magnitude must be in [0, 1]');
        }

        let record = this.scores.get(event.actor_pk_hash);
        if (!record) {
            record = {
                actor_pk_hash: event.actor_pk_hash,
                score: this.initial_score,
                event_count: 0,
                last_updated: event.timestamp,
            };
            this.scores.set(event.actor_pk_hash, record);
        }

        // 事件目标分数：good = 1, bad = 0
        const target = event.event_type === 'good' ? 1 : 0;

        // 加权更新：score = (1-α) * score + α * magnitude * target + α * (1-magnitude) * score
        // 即：事件强度越大，对信任度影响越大
        const weight = this.alpha * event.magnitude;
        record.score = (1 - weight) * record.score + weight * target;

        // 确保在 [0, 1] 范围内
        record.score = Math.max(0, Math.min(1, record.score));

        record.event_count++;
        record.last_updated = event.timestamp;

        return record.score;
    }

    /**
     * 获取信任度
     */
    getScore(actor_pk_hash: string): number {
        const record = this.scores.get(actor_pk_hash);
        return record ? record.score : this.initial_score;
    }

    /**
     * 获取完整记录
     */
    getRecord(actor_pk_hash: string): TrustRecord | null {
        return this.scores.get(actor_pk_hash) ?? null;
    }

    /**
     * 列出所有低于阈值的 actor
     */
    listBelowThreshold(threshold: number): TrustRecord[] {
        return Array.from(this.scores.values()).filter((r) => r.score < threshold);
    }

    /**
     * 获取所有记录
     */
    getAll(): TrustRecord[] {
        return Array.from(this.scores.values());
    }

    /**
     * 重置某个 actor 的信任度
     */
    reset(actor_pk_hash: string): void {
        this.scores.delete(actor_pk_hash);
    }

    /**
     * 清空（仅测试用）
     */
    clear(): void {
        this.scores.clear();
    }

    /**
     * 获取记录数
     */
    size(): number {
        return this.scores.size;
    }
}
