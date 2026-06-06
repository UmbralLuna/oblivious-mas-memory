# Installation Guide

## System Requirements

> **•** **OS**: Ubuntu 20.04+ / macOS 12+
>
> **•** **CPU**: x86_64 (ARM64 supported with limitations)
>
> **•** **RAM**: >= 4GB (8GB recommended for circuit compilation)
>
> **•** **Disk**: >= 2GB free space

## Step 1: Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verify
node --version  # >= 18.x
npm --version   # >= 9.x
```

## Step 2: Install Circom (Optional)

Only needed if you want to recompile circuits from source.

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
sudo cp target/release/circom /usr/local/bin/
circom --version
```

## Step 3: Install Python (for table generation)

```bash
# Ubuntu
sudo apt-get install python3 python3-pip
pip3 install openpyxl

# macOS
brew install python3
pip3 install openpyxl
```

## Step 4: Install Project Dependencies

```bash
cd oblivious-mas-memory
npm install
```

## Step 5: Build

```bash
# Compile TypeScript
npm run build

# Compile circuits (if Circom installed)
bash scripts/build/build_circuits.sh

# Or use pre-built circuits (included in artifacts/)
```

## Step 6: Verify Installation

```bash
# Quick test (~3 minutes)
npx ts-node experiments/exp3_e2e/run.ts

# Should output:
# === Exp3: End-to-End (Real Baselines) ===
# ...
# --- Baseline: ours ---
# Attack blocked: 116/150 (77.3%) 
```

## Troubleshooting

### Error: Cannot find module 'snarkjs'

```bash
npm install snarkjs
```

### Error: WASM file not found

```bash
# Ensure circuits are built
ls circuits/build/delegate_test/delegate_test_js/delegate_test.wasm
# If missing, rebuild:
bash scripts/build/build_circuits.sh
```

### Error: openpyxl not installed

```bash
pip3 install openpyxl
```

### Memory issues during circuit compilation

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```