// circuits/primitives/merkle_builder.circom
// 通用 Merkle 树构建器（完整二叉树）
// 规范 v4.0 §4.2.4: 修复 Phase 1 §6.3 scope_root 绑定 bug
//
// 用途：验证 child_scope_root 确实是 child partitions 的 Merkle 根
//       而非任意值

pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

/**
 * 递归构建完整 Merkle 树
 * 
 * 参数：
 *   depth: 树深度（log2(N_leaves)）
 *   N_leaves = 2^depth
 * 
 * 输入：
 *   leaves[N_leaves]: 所有叶子节点
 * 
 * 输出：
 *   root: Merkle 根
 */
template MerkleTreeBuilder(depth) {
    var N_leaves = 1 << depth;
    signal input leaves[N_leaves];
    signal output root;
    
    // 每一层的节点
    signal nodes[depth + 1][N_leaves];
    
    // 第 0 层：叶子
    for (var i = 0; i < N_leaves; i++) {
        nodes[0][i] <== leaves[i];
    }
    
    // 第 1 到 depth 层：递归哈希
    component hashers[depth][N_leaves / 2];
    for (var level = 0; level < depth; level++) {
        var level_size = N_leaves >> (level + 1);
        for (var i = 0; i < level_size; i++) {
            hashers[level][i] = Poseidon(2);
            hashers[level][i].inputs[0] <== nodes[level][i * 2];
            hashers[level][i].inputs[1] <== nodes[level][i * 2 + 1];
            nodes[level + 1][i] <== hashers[level][i].out;
        }
    }
    
    root <== nodes[depth][0];
}

/**
 * 带活跃标志的 Merkle 树构建器
 * 对于 is_active[i] = 0 的叶子，使用 0（padding）参与构建
 * 
 * 注意：调用者应确保 is_active 是二进制
 */
template MerkleTreeBuilderWithMask(depth) {
    var N_leaves = 1 << depth;
    signal input leaves[N_leaves];
    signal input is_active[N_leaves];
    signal output root;
    
    // 根据 is_active 选择叶子或 0
    signal masked_leaves[N_leaves];
    for (var i = 0; i < N_leaves; i++) {
        // 约束 is_active[i] 为二进制
        is_active[i] * (1 - is_active[i]) === 0;
        
        // masked = is_active ? leaf : 0
        masked_leaves[i] <== is_active[i] * leaves[i];
    }
    
    // 构建完整树
    component builder = MerkleTreeBuilder(depth);
    for (var i = 0; i < N_leaves; i++) {
        builder.leaves[i] <== masked_leaves[i];
    }
    
    root <== builder.root;
}