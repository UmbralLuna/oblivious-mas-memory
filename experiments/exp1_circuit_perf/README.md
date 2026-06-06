# Experiment 1: Circuit Performance

## 目标
测量 C_delegate 和 C_write 电路的性能指标。

## 平台
- **Prod (主)**: AWS c6i.4xlarge - 完整矩阵 (N_a × d_s × circuit)
- **Edge (对照)**: MateBook D14 - 子集 (N_a=16, d_s=6)

## 配置矩阵
- N_a ∈ {4, 8, 16, 32}
- d_s ∈ {4, 6}
- 每配置 100 次（Prod）/ 50 次（Edge）

## 测量指标
- r1cs_constraints_total
- compile_time_s
- witness_gen_time_ms
- prove_time_ms (P50, P99)
- proof_size_bytes (= 192)
- verify_time_ms
- prove_peak_rss_mb

## 运行
```bash
# Prod
ts-node experiments/exp1_circuit_perf/run_prod.ts

# Edge（含散热间隔）
ts-node experiments/exp1_circuit_perf/run_edge.ts

# 跳过平台检查（开发模式）
SKIP_PLATFORM_CHECK=1 SKIP_COOLDOWN=1 ts-node experiments/exp1_circuit_perf/run_edge.ts