#!/bin/bash
cd /root/oblivious-mas-memory

# 确保目录存在
mkdir -p analysis/outputs/tables

echo "=== Generating LaTeX Tables ==="

# Table 1
echo "Generating Table 1..."
python3 analysis/tables/table1_circuit_perf.py > analysis/outputs/tables/table1_circuit_perf.tex
echo "✓ table1_circuit_perf.tex"

# Table 2
echo "Generating Table 2..."
python3 analysis/tables/table2_e2e_comparison.py > analysis/outputs/tables/table2_e2e_comparison.tex
echo "✓ table2_e2e_comparison.tex"

# Table 3
echo "Generating Table 3..."
python3 analysis/tables/table3_defense.py > analysis/outputs/tables/table3_defense.tex
echo "✓ table3_defense.tex"

# Table 4
echo "Generating Table 4..."
python3 analysis/tables/table4_ablation.py > analysis/outputs/tables/table4_ablation.tex
echo "✓ table4_ablation.tex"

# Table 5
echo "Generating Table 5..."
python3 analysis/tables/table5_scalability.py > analysis/outputs/tables/table5_scalability.tex
echo "✓ table5_scalability.tex"

echo ""
echo "=== All tables generated ==="
ls -lh analysis/outputs/tables/
