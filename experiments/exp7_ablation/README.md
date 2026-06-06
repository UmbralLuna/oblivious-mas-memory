# Experiment 7: Ablation Study

## 目标

6 个消融变体的退化分析（B+ 杠杆）。

## 变体与预期退化

| 变体             | 关键指标          | 预期           | 平台 |
| ---------------- | ----------------- | -------------- | ---- |
| no_g4            | leakage_score     | < 0.05 → > 0.3 | Prod |
| no_g43           | depth_diff median | X → < X/2      | Prod |
| no_g5            | tag relax success | 0% → > 30%     | Prod |
| no_g61           | collusion block   | 100% → < 50%   | Edge |
| plaintext_id     | id inference acc  | 0.5 → > 0.9    | Edge |
| no_session_token | e2e P50           | Y → ≈ 18Y      | Edge |

## 验收

每个消融退化幅度 ≥ 1.5×（Cliff's delta ≥ 0.474）

## 运行

```bash
ts-node experiments/exp7_ablation/run.ts
```
