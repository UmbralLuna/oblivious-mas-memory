#!/usr/bin/env bash
# 运行全部 8 个实验
set -euo pipefail
echo "=========================================="
echo "  运行全部实验"
echo "  预计时间: 8-10 小时"
echo "=========================================="
echo ""
START_TIME=$(date +%s)
# Exp1: 电路性能 (2-3 小时)
echo "[1/8] Exp1: 电路性能测试..."
echo "  预计时间: 2-3 小时"
npx ts-node experiments/exp1_circuit_perf/run_prod.ts
npx ts-node experiments/exp1_circuit_perf/run_edge.ts
echo "✓ Exp1 完成"
echo ""
# Exp2: 正确性测试 (2-3 小时)
echo "[2/8] Exp2: 正确性测试..."
echo "  预计时间: 2-3 小时"
# npx ts-node experiments/exp2_correctness/run.ts
# echo "✓ Exp2 完成"
# echo ""
# # Exp3: 端到端延迟 (1-2 小时)
# echo "[3/8] Exp3: 端到端延迟..."
# echo "  预计时间: 1-2 小时"
npx ts-node experiments/exp3_e2e/run.ts
echo "✓ Exp3 完成"
echo ""
# Exp4: 防御效果 (30 分钟)
echo "[4/8] Exp4: 防御效果..."
echo "  预计时间: 30 分钟"
npx ts-node experiments/exp4_defense/run.ts
echo "✓ Exp4 完成"
echo ""
# Exp5: 方案对比 (5 分钟)
echo "[5/8] Exp5: 方案对比..."
echo "  预计时间: 5 分钟"
npx ts-node experiments/exp5_comparison/run.ts
echo "✓ Exp5 完成"
echo ""
# Exp6: 可扩展性 (1 小时)
echo "[6/8] Exp6: 可扩展性..."
echo "  预计时间: 1 小时"
npx ts-node experiments/exp6_scalability/run.ts
echo "✓ Exp6 完成"
echo ""
# Exp7: 消融实验 (2 小时)
echo "[7/8] Exp7: 消融实验..."
echo "  预计时间: 2 小时"
npx ts-node experiments/exp7_ablation/run.ts
echo "✓ Exp7 完成"
echo ""
# Exp8: 自适应攻击 (2 小时)
echo "[8/8] Exp8: 自适应攻击..."
echo "  预计时间: 2 小时"
npx ts-node experiments/exp8_adaptive/run.ts
echo "✓ Exp8 完成"
echo ""
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
HOURS=$((DURATION / 3600))
MINUTES=$(((DURATION % 3600) / 60))
echo "=========================================="
echo "  全部实验完成！"
echo "  总耗时: ${HOURS}小时 ${MINUTES}分钟"
echo "=========================================="
echo ""
echo "结果保存在: analysis/results/"
echo ""
echo "下一步: 运行批次 11 的数据分析"
