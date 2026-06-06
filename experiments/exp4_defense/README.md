# Experiment 4: Two-Layer Defense

## 目标

评估 MWPP（密码学层）+ 内容检测的组合效果。

## 攻击场景（共 350 次）

- A 无权限写入：100
- B 明显恶意：100
- C 对抗性：100
- D 合谋：50

## 检测器（3 个）

- A: Isolation Forest（嵌入异常）
- B: GPT-4o-mini LLM-as-judge
- C: GPT-4o LLM-as-judge

## 防御组合

- mwpp_only
- content_only
- combined

## 期望（Combined）

- A: 100% 拦截
- B: ≥ 80% 拦截
- C: 25-40% 拦截 + 100% 可追溯
- D: 20-30% 拦截 + 100% 可追溯

## 运行

```bash
ts-node experiments/exp4_defense/run.ts
```
