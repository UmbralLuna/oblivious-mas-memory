# Experiment 8: Adaptive Attacks

## 目标

评估 3 类自适应攻击的拦截率（必做-B）。

## 攻击类型

| 攻击             | 数量 | 期望拦截率 |
| ---------------- | ---- | ---------- |
| 白盒电路输入构造 | 100  | > 95%      |
| Scope 模糊性     | 50   | 100%       |
| RL 优化合谋      | 30   | > 90%      |

## 平台

Prod

## 运行

```bash
ts-node experiments/exp8_adaptive/run.ts
```
