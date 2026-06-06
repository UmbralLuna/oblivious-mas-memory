#!/usr/bin/env bash
# 运行 Exp3-8（跳过 Exp2）
set -euo pipefail
START_TIME=$(date +%s)
echo "=========================================="
echo "  运行实验 3-8"
echo "  预计时间: 4-6 小时"
echo "=========================================="
echo ""
# Exp3: 端到端延迟 (1-2 小时)
echo "[3/8] Exp3: 端到端延迟..."
echo "  预计时间: 1-2 小时"
if [ -f experiments/exp3_e2e/run.ts ]; then
    npx ts-node experiments/exp3_e2e/run.ts
    echo "✓ Exp3 完成"
else
    echo "⚠ Exp3 脚本不存在，跳过"
fi
echo ""
# Exp4: 防御效果 (30 分钟)
echo "[4/8] Exp4: 防御效果..."
echo "  预计时间: 30 分钟"
if [ -f experiments/exp4_defense/run.ts ]; then
    npx ts-node experiments/exp4_defense/run.ts
    echo "✓ Exp4 完成"
else
    echo "⚠ Exp4 脚本不存在，跳过"
fi
echo ""
# Exp5: 方案对比 (5 分钟)
echo "[5/8] Exp5: 方案对比..."
echo "  预计时间: 5 分钟"
if [ -f experiments/exp5_comparison/run.ts ]; then
    npx ts-node experiments/exp5_comparison/run.ts
    echo "✓ Exp5 完成"
else
    echo "⚠ Exp5 脚本不存在，跳过"
fi
echo ""
# Exp6: 可扩展性 (1 小时)
echo "[6/8] Exp6: 可扩展性..."
echo "  预计时间: 1 小时"
if [ -f experiments/exp6_scalability/run.ts ]; then
    npx ts-node experiments/exp6_scalability/run.ts
    echo "✓ Exp6 完成"
else
    echo "⚠ Exp6 脚本不存在，跳过"
fi
echo ""
# Exp7: 消融实验 (2 小时)
echo "[7/8] Exp7: 消融实验..."
echo "  预计时间: 2 小时"
if [ -f experiments/exp7_ablation/run.ts ]; then
    npx ts-node experiments/exp7_ablation/run.ts
    echo "✓ Exp7 完成"
else
    echo "⚠ Exp7 脚本不存在，跳过"
fi
echo ""
# Exp8: 自适应攻击 (2 小时)
echo "[8/8] Exp8: 自适应攻击..."
echo "  预计时间: 2 小时"
if [ -f experiments/exp8_adaptive/run.ts ]; then
    npx ts-node experiments/exp8_adaptive/run.ts
    echo "✓ Exp8 完成"
else
    echo "⚠ Exp8 脚本不存在，跳过"
fi
echo ""
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
HOURS=$((DURATION / 3600))
MINUTES=$(((DURATION % 3600) / 60))
echo "=========================================="
echo "  实验 3-8 完成！"
echo "  总耗时: ${HOURS}小时 ${MINUTES}分钟"
echo "=========================================="
echo ""
echo "结果保存在: analysis/results/"
