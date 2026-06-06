#!/usr/bin/env bash
# Exp1: 测试所有 8 个配置
set -euo pipefail
RESULTS_DIR="analysis/results/exp1_circuit_perf/prod"
mkdir -p $RESULTS_DIR
OUTPUT="$RESULTS_DIR/exp1_all_configs_$(date +%s).jsonl"
echo "=== Exp1: Circuit Performance (All Configs) ==="
echo "Output: $OUTPUT"
echo ""
configs=("4,4" "4,6" "8,4" "8,6" "16,4" "16,6" "32,4" "32,6")
for config in "${configs[@]}"; do
    IFS=',' read -r N d <<< "$config"
    
    FIXTURE="circuits/tests/fixtures/delegate_N${N}_d${d}.json"
    WASM="circuits/build/delegate_test_N${N}_d${d}/delegate_test_N${N}_d${d}_js/delegate_test_N${N}_d${d}.wasm"
    ZKEY="artifacts/keys/delegate_test_N${N}_d${d}.zkey"
    VKEY="artifacts/keys/delegate_test_N${N}_d${d}_vkey.json"
    
    echo "Testing N=$N, d=$d (100 iterations)..."
    
    for i in {1..100}; do
        # Prove
        start=$(date +%s%3N)
        snarkjs groth16 fullprove $FIXTURE $WASM $ZKEY /tmp/proof.json /tmp/public.json > /dev/null 2>&1
        end=$(date +%s%3N)
        prove_time=$((end - start))
        
        # Verify
        start=$(date +%s%3N)
        snarkjs groth16 verify $VKEY /tmp/public.json /tmp/proof.json > /dev/null 2>&1
        end=$(date +%s%3N)
        verify_time=$((end - start))
        
        # Proof size
        proof_size=$(stat -c%s /tmp/proof.json 2>/dev/null || stat -f%z /tmp/proof.json)
        
        # 输出 JSONL
        echo "{\"circuit\":\"delegate_test\",\"N_a\":$N,\"d_s\":$d,\"iteration\":$i,\"prove_time_ms\":$prove_time,\"verify_time_ms\":$verify_time,\"proof_size_bytes\":$proof_size,\"platform\":\"prod\"}" >> $OUTPUT
        
        [ $((i % 20)) -eq 0 ] && echo "  Progress: $i/100"
    done
    
    echo "  ✓ N=$N d=$d 完成"
    echo ""
done
echo "=== Exp1 完成 ==="
echo "Output: $OUTPUT"
echo "Total samples: $((${#configs[@]} * 100))"
