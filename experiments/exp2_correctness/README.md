# Experiment 2: Circuit Correctness

## 目标

全面验证 C_delegate 和 C_write 电路的正确性。

## 测试矩阵（共 6,200 项）

| 类型                       | 数量  |
| -------------------------- | ----- |
| 手写合法 fixture           | 100   |
| 手写非法 fixture           | 100   |
| 差分测试（vs TS 参考实现） | 1,000 |
| 属性测试（10 性质 × 200）  | 2,000 |
| 边界条件（30 × 100）       | 3,000 |

## 验收

- 100/100 合法案例通过
- 100/100 非法案例拒绝
- 0/1000 差分 divergence
- 0/2000 PBT 失败
- 0/3000 边界条件失败

## 运行

```bash
ts-node experiments/exp2_correctness/run.ts
```
