// circuits/primitives/conditional_merkle.circom
// 条件 Merkle 树验证器（含 enabled 切换）
// 规范 v4.0 §4.1.3（修复 Phase 1 §2.1 bug）
//
// 关键修复：
// - enabled = 1 时：强制 computed[depth] === root
// - enabled = 0 时：跳过验证（用于 padding 分区）
// - 旧版 bug："padding 分区强制等于 root" 已修复

pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mux1.circom";

/**
 * 条件 Merkle 树成员证明验证
 * 
 * 当 enabled = 1 时：强制 computed Merkle root 等于输入 root
 * 当 enabled = 0 时：不强制（用于 padding 分区）
 */
template ConditionalMerkleChecker(depth) {
    signal input enabled;  // 1=验证, 0=跳过
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    
    // 约束 enabled 为二进制
    enabled * (1 - enabled) === 0;
    
    signal computed[depth + 1];
    computed[0] <== leaf;
    
    component hashers[depth];
    component leftSelector[depth];
    component rightSelector[depth];
    
    for (var i = 0; i < depth; i++) {
        // 约束 pathIndices[i] 为二进制
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        
        // 选择左节点
        leftSelector[i] = Mux1();
        leftSelector[i].c[0] <== computed[i];
        leftSelector[i].c[1] <== pathElements[i];
        leftSelector[i].s <== pathIndices[i];
        
        // 选择右节点
        rightSelector[i] = Mux1();
        rightSelector[i].c[0] <== pathElements[i];
        rightSelector[i].c[1] <== computed[i];
        rightSelector[i].s <== pathIndices[i];
        
        // 哈希
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== leftSelector[i].out;
        hashers[i].inputs[1] <== rightSelector[i].out;
        
        computed[i + 1] <== hashers[i].out;
    }
    
    // 条件约束：enabled * (computed[depth] - root) === 0
    // enabled = 1: 强制 computed === root
    // enabled = 0: 无约束
    signal diff;
    diff <== computed[depth] - root;
    enabled * diff === 0;
}