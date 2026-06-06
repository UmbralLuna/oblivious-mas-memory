# Experiment 5: 6-Baseline Comparison

## 目标

6 方案 × 8 维度对比，生成 radar chart。

## 方案

1. NoAC
2. RBAC
3. ABAC
4. Collaborative Memory
5. AIP
6. Ours

## 维度

1. Verify Latency
2. Task Completion
3. Attack Block Rate
4. Leakage Score (lower better)
5. Type Awareness
6. Delegation Chain Support
7. Privacy
8. Throughput

## 数据源

聚合 Exp1（性能）+ Exp3（安全）数据。

## 运行

```bash
ts-node experiments/exp5_comparison/run.ts
```
