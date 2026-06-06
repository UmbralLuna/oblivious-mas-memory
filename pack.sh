#!/bin/bash
cd /root/oblivious-mas-memory
echo "=========================================="
echo "  打包完整项目"
echo "=========================================="
# 先清理
echo "清理临时大文件..."
rm -f experiments/mpc_setup/results/party_*.ptau
# 打包（排除node_modules和.git）
echo "打包中..."
tar -czf /root/oblivious-mas-memory-full.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='experiments/mpc_setup/results/party_*.ptau' \
  -C /root oblivious-mas-memory
echo ""
echo "✅ 打包完成！"
echo ""
echo "文件: /root/oblivious-mas-memory-full.tar.gz"
ls -lh /root/oblivious-mas-memory-full.tar.gz
echo ""
echo "下载命令:"
echo "  scp root@<服务器IP>:/root/oblivious-mas-memory-full.tar.gz ."
echo ""
echo "解压命令:"
echo "  tar -xzf oblivious-mas-memory-full.tar.gz -C /root"
echo "  cd /root/oblivious-mas-memory"
echo "  npm install"
