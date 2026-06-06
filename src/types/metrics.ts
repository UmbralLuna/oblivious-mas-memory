// src/types/metrics.ts

/**
 * ZKP 时间统计阶段
 */
export type ZKPPhase = 'witness' | 'prove' | 'verify';

/**
 * 攻击者类型
 */
export type AttackerType = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * 详细指标（论文实验数据）
 */
export interface DetailedMetrics {
    // ===== ZKP 性能 =====
    zkp_witness_gen_ms_p50: number;
    zkp_witness_gen_ms_p90: number;
    zkp_witness_gen_ms_p99: number;
    zkp_prove_ms_p50: number;
    zkp_prove_ms_p90: number;
    zkp_prove_ms_p99: number;
    zkp_verify_ms_p50: number;
    zkp_verify_ms_p90: number;
    zkp_verify_ms_p99: number;

    // ===== Session Token =====
    session_token_hit_count: number;
    session_token_miss_count: number;
    session_token_hit_rate: number;

    // ===== 内存使用 =====
    memory_peak_mb_p50: number;
    memory_peak_mb_p90: number;
    memory_avg_mb: number;

    // ===== 攻击统计 =====
    attack_count_by_type: Record<AttackerType, number>;
    attack_blocked_count: number;
    attack_blocked_by_type: Record<AttackerType, number>;
    attack_block_rate: number;
    attack_block_rate_by_type: Record<AttackerType, number>;

    // ===== 信息泄露 =====
    cross_dept_access_count: number;
    cross_dept_access_blocked: number;
    info_leakage_score: number;

    // ===== 端到端 =====
    e2e_latency_p50_ms: number;
    e2e_latency_p90_ms: number;
    e2e_latency_p99_ms: number;

    // ===== 任务完成 =====
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    completion_rate: number;
}

/**
 * 实验记录（JSONL 单行）
 */
export interface ExperimentRecord {
    schema_version: '1.0.0';
    exp_id: string;
    sub_exp?: string;
    baseline?: string;
    platform: 'edge' | 'prod' | 'unknown';
    run_id?: number;
    iteration?: number;
    config?: Record<string, unknown>;
    seed?: number;
    machine: unknown;
    timestamp_iso: string;
    metrics?: Record<string, number | string>;
    detailed_metrics?: DetailedMetrics;
    status: 'ok' | 'error' | 'timeout' | 'skipped';
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
    [key: string]: unknown; // 允许扩展字段
}
