# Experiment 6: Scalability

## 平台

Prod (AWS c6i.4xlarge)

## 维度

- n_agents ∈ {10, 50, 100}
- delegation_depth ∈ {1, 2, 3, 5}
- concurrent_qps ∈ {1, 10, 50, 100}
- nullifier_set_size ∈ {10³, 10⁵}

## 验收

- 100 QPS 下 P99 延迟 < 50ms
- 验证吞吐拟合 log-log 线性
- 委托链 d=5 端到端延迟 < 5×单次

## 运行

```bash
ts-node experiments/exp6_scalability/run.ts
```
