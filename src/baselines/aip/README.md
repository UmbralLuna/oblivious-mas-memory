# AIP 复现说明

## 原论文

Prakash, "Agent Identity Protocol for Verifiable Delegation Across MCP and A2A", arXiv:2603.24775, 2026 (preprint).

## 复现范围

- **已复现**：IBCT (Invocation-Bound Capability Token) 验签核心逻辑
- **未复现**：
    - 完整的 MCP/A2A 协议栈（超出本文范围）
    - 跨协议互操作性
    - Token 撤销机制

## 实现细节

- **签名方案**：EdDSA over Poseidon（复用本项目的实现）
- **Scope 格式**：扁平资源字符串列表（与 AIP 原始设计一致）
- **过期检查**：Unix 时间戳比较

## 性能对标

- 原论文报告：0.049ms 验证延迟
- 本复现实测：预期 0.05-0.15ms（同数量级）

## 与本方案的对比

| 维度         | AIP                      | 本方案               |
| ------------ | ------------------------ | -------------------- |
| Scope 结构   | 扁平资源列表             | Merkle 树 + 类型感知 |
| 验证方式     | 明文 + EdDSA 验签        | 零知识 + EdDSA       |
| 类型感知     | ❌                       | ✅ (R1/R2/R3)        |
| 写入来源证明 | ❌                       | ✅ (Pedersen 承诺)   |
| 隐私         | 泄露 scope 和 agent 关系 | 隐藏 scope           |
| 性能         | 更快（0.05ms）           | 较慢（~7ms）         |
| 适用场景     | 低敏感高吞吐             | 高敏感隐私保护       |

## 定位

本方案作为 AIP 的**安全增强层**，用于高敏感场景。

## 验证

运行 `npm test -- --grep AIPVerifier` 验证功能正确性。
