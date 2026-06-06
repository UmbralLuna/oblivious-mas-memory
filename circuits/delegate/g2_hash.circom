// circuits/delegate/g2_hash.circom
// G2: 哈希一致性验证（~500 约束）
// 规范 v4.0 §4.2.4（修复 Phase 1 §6.3）
//
// 验证：
//   1. h_c = Poseidon(child_cap || randomness)
//   2. child_tc_hash = Poseidon(child_tc)
//   3. parent_tc_hash = Poseidon(parent_tc)
//   4. child_scope_root 是 child partitions 的实际 Merkle 根

pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "../primitives/merkle_builder.circom";
include "circomlib/circuits/poseidon.circom";

template G2HashConsistency(N_a) {
    // 公共输入
    signal input h_c;

    // 私有输入：子令牌字段
    signal input child_iss;
    signal input child_hld;
    signal input child_scope_root;
    signal input child_perm;
    signal input child_depth;
    signal input child_exp;
    signal input child_attr_hash;
    signal input child_tc_hash;
    signal input randomness;

    // 私有输入：类型约束
    signal input parent_tc[3];
    signal input child_tc[3];
    signal input parent_tc_hash;

    // 私有输入：子 scope 分区
    signal input partition_M[N_a];
    signal input partition_tau[N_a];
    signal input partition_tags[N_a];
    signal input partition_s[N_a];
    signal input partition_is_active[N_a];

    // 输出：子分区叶子哈希（供 G3 使用）
    signal output child_leaf_hashes[N_a];

    // G2.1: h_c = Poseidon(child_cap || randomness)
    component cap_child_hash = HashCapabilityWithRandomness();
    cap_child_hash.iss <== child_iss;
    cap_child_hash.hld <== child_hld;
    cap_child_hash.scope_root <== child_scope_root;
    cap_child_hash.perm <== child_perm;
    cap_child_hash.depth <== child_depth;
    cap_child_hash.exp <== child_exp;
    cap_child_hash.attr_hash <== child_attr_hash;
    cap_child_hash.tc_hash <== child_tc_hash;
    cap_child_hash.randomness <== randomness;

    h_c === cap_child_hash.out;

    // G2.2: parent_tc_hash 一致性
    component p_tc_h = Poseidon(3);
    for (var i = 0; i < 3; i++) {
        p_tc_h.inputs[i] <== parent_tc[i];
    }
    parent_tc_hash === p_tc_h.out;

    // G2.3: child_tc_hash 一致性
    component c_tc_h = Poseidon(3);
    for (var i = 0; i < 3; i++) {
        c_tc_h.inputs[i] <== child_tc[i];
    }
    child_tc_hash === c_tc_h.out;

    // G2.4: 计算子分区叶子哈希
    component child_leaf[N_a];
    for (var i = 0; i < N_a; i++) {
        child_leaf[i] = HashPartitionLeaf();
        child_leaf[i].M <== partition_M[i];
        child_leaf[i].tau <== partition_tau[i];
        child_leaf[i].tags <== partition_tags[i];
        child_leaf[i].s <== partition_s[i];

        child_leaf_hashes[i] <== child_leaf[i].out;
    }

    // G2.5: [修复] child_scope_root = MerkleRoot(child_leaves)
    // 动态计算 depth = log2(N_a)
    // N_a=4 → depth=2, N_a=8 → depth=3, N_a=16 → depth=4, N_a=32 → depth=5
    
    // Circom 编译时常量计算
    var depth = 0;
    var temp = N_a;
    while (temp > 1) {
        depth = depth + 1;
        temp = temp \ 2;
    }
    
    component tree_builder = MerkleTreeBuilderWithMask(depth);
    for (var i = 0; i < N_a; i++) {
        tree_builder.leaves[i] <== child_leaf[i].out;
        tree_builder.is_active[i] <== partition_is_active[i];
    }
    child_scope_root === tree_builder.root;
}
