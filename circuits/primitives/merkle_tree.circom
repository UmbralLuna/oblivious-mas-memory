// circuits/primitives/merkle_tree.circom
// 标准 Merkle 树验证器（无条件分支版）
// 规范 v4.0 §4.1.3

pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mux1.circom";

/**
 * 标准 Merkle 树成员证明验证
 * 验证 leaf 在根为 root 的 Merkle 树中
 * 
 * 注意：pathIndices[i] 必须是 0 或 1（内部会约束）
 */
template MerkleTreeChecker(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    
    signal computed[depth + 1];
    computed[0] <== leaf;
    
    component hashers[depth];
    component leftSelector[depth];
    component rightSelector[depth];
    
    for (var i = 0; i < depth; i++) {
        // 约束 pathIndices[i] 为二进制
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        
        // 根据 pathIndices[i] 选择左右子节点
        // pathIndices[i] = 0: computed[i] 在左，pathElements[i] 在右
        // pathIndices[i] = 1: pathElements[i] 在左，computed[i] 在右
        leftSelector[i] = Mux1();
        leftSelector[i].c[0] <== computed[i];
        leftSelector[i].c[1] <== pathElements[i];
        leftSelector[i].s <== pathIndices[i];
        
        rightSelector[i] = Mux1();
        rightSelector[i].c[0] <== pathElements[i];
        rightSelector[i].c[1] <== computed[i];
        rightSelector[i].s <== pathIndices[i];
        
        // 哈希：Poseidon(left, right)
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== leftSelector[i].out;
        hashers[i].inputs[1] <== rightSelector[i].out;
        
        computed[i + 1] <== hashers[i].out;
    }
    
    // 强制约束：computed[depth] === root
    root === computed[depth];
}