#!/usr/bin/env bash
# scripts/cloud/init_remote.sh
# 在 AWS 实例上初始化环境
set -euo pipefail

echo "=== Initializing AWS instance ==="

# 1. 更新系统
sudo apt-get update
sudo apt-get install -y build-essential git curl wget \
    python3-pip python3-dev libsqlite3-dev \
    libffi-dev libgmp-dev nodejs npm

# 2. 安装 Node.js 20.11.0
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 Rust + Circom 2.1.6
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

git clone https://github.com/iden3/circom.git /tmp/circom
cd /tmp/circom
git checkout v2.1.6
cargo build --release
sudo cp target/release/circom /usr/local/bin/
circom --version

# 4. 安装 snarkjs 0.7.4
sudo npm install -g snarkjs@0.7.4

# 5. 下载 PTAU（~200MB）
cd ~
mkdir -p artifacts/keys
cd artifacts/keys
wget -q https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau
echo "PTAU downloaded: $(ls -lh powersOfTau28_hez_final_15.ptau)"

echo "=== Setup complete ==="