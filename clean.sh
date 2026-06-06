#!/bin/bash
cd /root/oblivious-mas-memory
echo "=========================================="
echo "  清理多余文件"
echo "=========================================="
# 1. 清理旧实验结果（每个目录只保留最新1个）
echo "清理旧实验结果..."
for dir in analysis/results/exp1_circuit_perf/prod analysis/results/exp{2..8}* analysis/results/exp3_llm; do
  if [ -d "$dir" ]; then
    cd "$dir"
    count=$(ls -t *.jsonl 2>/dev/null | wc -l)
    if [ $count -gt 1 ]; then
      deleted=$((count - 1))
      ls -t *.jsonl | tail -n +2 | xargs rm -f
      echo "  $dir: 删除 $deleted 个旧文件"
    fi
    cd /root/oblivious-mas-memory
  fi
done
# 2. 清理MPC Setup的大文件
echo "清理MPC Setup临时文件..."
rm -f experiments/mpc_setup/results/party_*.ptau
echo "  ✓ 删除 .ptau 文件"
# 3. 清理临时文件
echo "清理临时文件..."
rm -f /tmp/fix_*.py
rm -f dir_structure.txt dir_only.txt
# 4. 清理编译产物中的map文件
echo "清理source map..."
find dist -name "*.map" -delete 2>/dev/null
echo ""
echo "✅ 清理完成！"
echo ""
echo "磁盘使用:"
du -sh /root/oblivious-mas-memory --exclude=node_modules
echo "(不含node_modules)"
echo ""
echo "实验结果文件:"
find analysis/results -name "*.jsonl" -type f | wc -l
echo "个JSONL文件"
