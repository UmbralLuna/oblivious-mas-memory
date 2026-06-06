#!/usr/bin/env bash
set -euo pipefail
variants=("no_g4" "no_g43" "no_g5" "no_g61" "plaintext_id" "no_session_token")
for variant in "${variants[@]}"; do
    echo "编译 ${variant}..."
    
    mkdir -p circuits/build/ablation/${variant}
    
    circom circuits/ablation/${variant}.circom \
        --r1cs --wasm --sym \
        -o circuits/build/ablation/${variant} \
        -l node_modules 2>&1 | grep -E "template instances|constraints|Written successfully"
    
    snarkjs groth16 setup \
        circuits/build/ablation/${variant}/${variant}.r1cs \
        artifacts/keys/powersOfTau28_hez_final_16.ptau \
        artifacts/keys/${variant}.zkey.0 > /dev/null 2>&1
    
    snarkjs zkey contribute \
        artifacts/keys/${variant}.zkey.0 \
        artifacts/keys/${variant}.zkey \
        --name="contrib1" -e="${variant}" > /dev/null 2>&1
    
    snarkjs zkey export verificationkey \
        artifacts/keys/${variant}.zkey \
        artifacts/keys/${variant}_vkey.json > /dev/null 2>&1
    
    rm artifacts/keys/${variant}.zkey.0
    
    echo "  ✓ ${variant} 完成"
    echo ""
done
echo "✓ 全部 ablation 电路编译完成"
