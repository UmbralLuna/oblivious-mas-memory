#!/usr/bin/env bash
set -euo pipefail
echo "[6/8] Exp6: 可扩展性..."
if [ -f experiments/exp6_scalability/run.ts ]; then
    npx ts-node experiments/exp6_scalability/run.ts
    echo "✓ Exp6 完成"
else
    echo "⚠ Exp6 脚本不存在"
fi
echo ""
echo "[7/8] Exp7: 消融实验..."
if [ -f experiments/exp7_ablation/run.ts ]; then
    npx ts-node experiments/exp7_ablation/run.ts
    echo "✓ Exp7 完成"
else
    echo "⚠ Exp7 脚本不存在"
fi
echo ""
echo "[8/8] Exp8: 自适应攻击..."
if [ -f experiments/exp8_adaptive/run.ts ]; then
    npx ts-node experiments/exp8_adaptive/run.ts
    echo "✓ Exp8 完成"
else
    echo "⚠ Exp8 脚本不存在"
fi
