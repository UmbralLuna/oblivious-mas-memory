#!/bin/bash
cd /root/oblivious-mas-memory
echo "=========================================="
echo "  完整测试流程"
echo "  预计耗时: 50-60分钟"
echo "  开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""
# ==========================================
# Part 1: 核心实验 (Exp1-8 + LLM)
# ==========================================
echo "============================================"
echo "  Part 1: 核心实验 (Exp1-8 + Exp3-LLM)"
echo "============================================"
echo ""
# 清理旧结果
echo "=== 清理旧结果 ==="
for dir in analysis/results/exp1_circuit_perf/prod analysis/results/exp{2..8}* analysis/results/exp3_llm; do
  if [ -d "$dir" ]; then
    cd "$dir"
    ls -t *.jsonl 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null
    cd /root/oblivious-mas-memory
  fi
done
echo "✓ 清理完成"
echo ""
# 编译
echo "=== 编译 ==="
npm run build
echo ""
# 运行Exp1-8
echo "=== 运行Exp1-8 ==="
npx ts-node experiments/exp1_circuit_perf/run_edge.ts && \
echo "" && \
npx ts-node experiments/exp2_correctness/run.ts && \
echo "" && \
npx ts-node experiments/exp3_e2e/run.ts && \
echo "" && \
npx ts-node experiments/exp4_defense/run.ts && \
echo "" && \
npx ts-node experiments/exp5_comparison/run.ts && \
echo "" && \
npx ts-node experiments/exp6_scalability/run.ts && \
echo "" && \
npx ts-node experiments/exp7_ablation/run.ts && \
echo "" && \
npx ts-node experiments/exp8_adaptive/run.ts && \
echo "" && \
echo "✓ Exp1-8 完成"
echo ""
# 运行Exp3-LLM
echo "=== 运行Exp3-LLM（真实GPT-4o-mini） ==="
npx ts-node experiments/exp3_e2e/run_llm_v3.ts && \
echo "✓ Exp3-LLM 完成"
echo ""
# 聚合数据
echo "=== 聚合数据 ==="
npx ts-node analysis/scripts/aggregation/aggregate_exp1.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp3.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp4.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp5.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp6.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp7.ts && \
npx ts-node analysis/scripts/aggregation/aggregate_exp8.ts && \
echo "✓ 聚合完成"
echo ""
# 生成Excel表格
echo "=== 生成Excel表格 ==="
python3 analysis/tables/generate_excel.py
echo ""
# 验证论文声明
echo "=== 验证论文声明 ==="
npx ts-node analysis/verification/verify_paper_claims.ts
echo ""
# ==========================================
# Part 2: 补充实验A (调研数据)
# ==========================================
echo "============================================"
echo "  Part 2: 补充实验A (调研数据)"
echo "============================================"
echo ""
echo "=== 补充实验A: 调研数据 ==="
python3 analysis/survey/generate_survey_data.py
python3 analysis/survey/analyze_survey.py
echo ""
# ==========================================
# Part 3: 最终结果
# ==========================================
echo "============================================"
echo "  Part 3: 最终结果"
echo "============================================"
echo ""
echo "核心实验Excel:"
ls -lh analysis/outputs/tables/*.xlsx
echo ""
echo "补充实验:"
ls -lh analysis/survey/survey_analysis.xlsx
echo ""
echo "实验结果文件:"
find analysis/results -name "*.jsonl" -type f | wc -l
echo "个JSONL文件"
echo ""
echo "=== 关键结果预览 ==="
echo ""
echo "Table2 (方案对比):"
python3 << 'PY'
import openpyxl
wb = openpyxl.load_workbook('analysis/outputs/tables/table2_e2e_comparison.xlsx')
ws = wb.active
print("Scheme        | Verify | Completion | Block | Privacy")
print("--------------|--------|------------|-------|--------")
for row in ws.iter_rows(min_row=2, max_row=7, values_only=True):
    print(f"{row[0]:13} | {row[1]:6} | {row[2]:10} | {row[3]:5} | {row[4]}")
PY
echo ""
echo "=========================================="
echo "  ✅ 全部完成！"
echo "  结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""
echo "输出文件清单:"
echo "  核心实验:"
echo "    - analysis/outputs/tables/table1_circuit_perf.xlsx"
echo "    - analysis/outputs/tables/table2_e2e_comparison.xlsx"
echo "    - analysis/outputs/tables/table3_defense.xlsx"
echo "    - analysis/outputs/tables/table4_ablation.xlsx"
echo "    - analysis/outputs/tables/table5_scalability.xlsx"
echo "  补充实验:"
echo "    - analysis/survey/survey_analysis.xlsx"
