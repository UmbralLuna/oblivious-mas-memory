# Experiment 3: End-to-End

## 目标

评估端到端的多智能体协作 + 6 方案对比。

## 场景

- **E3.1 Enterprise**: 5 部门 × 35 agents, 500 任务（60% 模板 + 40% AgentBench）
- **E3.2 Multi-user RAG**: 20 用户, 500 任务

## 对比方案（6 组）

1. ours (本方案)
2. no_ac
3. rbac
4. abac
5. collab_memory (Guo et al. 2025)
6. aip (Prakash 2026)

## 指标

- task_completion_rate
- session_token_hit_rate
- attack_blocked_count by type (A/B/C/D/E)
- leakage_score
- e2e_latency P50/P90/P99

## 验收

- task_completion ≥ 95%
- session_token hit_rate ∈ [60%, 80%]
- ours leakage_score < 0.05
- A 类拦截率 = 100%

## 运行

```bash
ts-node experiments/exp3_e2e/run.ts
```
