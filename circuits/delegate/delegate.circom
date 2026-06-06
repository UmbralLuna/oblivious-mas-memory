// circuits/delegate/delegate.circom
// C_delegate 主电路：遗忘委托证明
// 规范 v4.0 §4.2.1 + §4.2.2
//
// 公共输入：h_c, pk_issuer[2], nullifier, current_time
// 预期总约束：~14,060（验收范围 [11,200, 18,300]）

pragma circom 2.1.6;

include "./g1_signature.circom";
include "./g2_hash.circom";
include "./g3_traditional.circom";
include "./g4_memtype.circom";
include "./g5_tags.circom";
include "./g6_binding.circom";

template ObliviousDelegation(N_a, d_s) {
    // ===== 公共输入 =====
    signal input h_c;
    signal input pk_issuer[2];
    signal input nullifier;
    signal input current_time;

    // ===== 私有输入：cap_parent =====
    signal input parent_iss;
    signal input parent_hld;
    signal input parent_scope_root;
    signal input parent_perm;
    signal input parent_depth;
    signal input parent_exp;
    signal input parent_attr_hash;
    signal input parent_tc_hash;
    signal input parent_tc[3];

    // ===== 私有输入：cap_child =====
    signal input child_iss;
    signal input child_hld;
    signal input child_scope_root;
    signal input child_perm;
    signal input child_depth;
    signal input child_exp;
    signal input child_attr_hash;
    signal input child_tc_hash;
    signal input child_tc[3];
    signal input randomness;

    // ===== 私有输入：父令牌签名 =====
    signal input sig_R8x;
    signal input sig_R8y;
    signal input sig_S;

    // ===== 私有输入：持有者 =====
    signal input holder_sk;
    signal input holder_pk_x;
    signal input holder_pk_y;

    // ===== 私有输入：子 scope 分区 =====
    signal input partition_M[N_a];
    signal input partition_tau[N_a];
    signal input partition_tags[N_a];
    signal input partition_s[N_a];
    signal input partition_is_active[N_a];

    // ===== 私有输入：Merkle 路径 =====
    signal input merkle_paths[N_a][d_s];
    signal input merkle_indices[N_a][d_s];

    // ===== 私有输入：R3 相关 =====
    signal input k_amplification;
    signal input depth_parent_partition[N_a];
    signal input depth_child_partition[N_a];

    // ===== G1: EdDSA 签名验证 (~6,000 约束) =====
    component g1 = G1Signature();
    g1.pk_issuer[0] <== pk_issuer[0];
    g1.pk_issuer[1] <== pk_issuer[1];
    g1.parent_iss <== parent_iss;
    g1.parent_hld <== parent_hld;
    g1.parent_scope_root <== parent_scope_root;
    g1.parent_perm <== parent_perm;
    g1.parent_depth <== parent_depth;
    g1.parent_exp <== parent_exp;
    g1.parent_attr_hash <== parent_attr_hash;
    g1.parent_tc_hash <== parent_tc_hash;
    g1.sig_R8x <== sig_R8x;
    g1.sig_R8y <== sig_R8y;
    g1.sig_S <== sig_S;

    // ===== G2: 哈希一致性验证 (~500 约束) =====
    component g2 = G2HashConsistency(N_a);
    g2.h_c <== h_c;
    g2.child_iss <== child_iss;
    g2.child_hld <== child_hld;
    g2.child_scope_root <== child_scope_root;
    g2.child_perm <== child_perm;
    g2.child_depth <== child_depth;
    g2.child_exp <== child_exp;
    g2.child_attr_hash <== child_attr_hash;
    g2.child_tc_hash <== child_tc_hash;
    g2.randomness <== randomness;
    for (var i = 0; i < 3; i++) {
        g2.parent_tc[i] <== parent_tc[i];
        g2.child_tc[i] <== child_tc[i];
    }
    g2.parent_tc_hash <== parent_tc_hash;
    for (var i = 0; i < N_a; i++) {
        g2.partition_M[i] <== partition_M[i];
        g2.partition_tau[i] <== partition_tau[i];
        g2.partition_tags[i] <== partition_tags[i];
        g2.partition_s[i] <== partition_s[i];
        g2.partition_is_active[i] <== partition_is_active[i];
    }

    // ===== G3: 传统委托约束 (~2,100 约束) =====
    component g3 = G3TraditionalConstraints(N_a, d_s);
    g3.parent_scope_root <== parent_scope_root;
    g3.parent_perm <== parent_perm;
    g3.parent_depth <== parent_depth;
    g3.parent_exp <== parent_exp;
    g3.child_perm <== child_perm;
    g3.child_depth <== child_depth;
    g3.child_exp <== child_exp;
    g3.current_time <== current_time;
    for (var i = 0; i < N_a; i++) {
        g3.partition_is_active[i] <== partition_is_active[i];
        g3.child_leaf_hashes[i] <== g2.child_leaf_hashes[i];
        for (var j = 0; j < d_s; j++) {
            g3.merkle_paths[i][j] <== merkle_paths[i][j];
            g3.merkle_indices[i][j] <== merkle_indices[i][j];
        }
    }

    // ===== G4: 记忆类型安全约束 (~3,220 约束) ★核心创新★ =====
    component g4 = G4MemoryTypeSafety(N_a);
    g4.pk_issuer[0] <== pk_issuer[0];
    g4.pk_issuer[1] <== pk_issuer[1];
    g4.child_iss <== child_iss;
    for (var i = 0; i < 3; i++) {
        g4.parent_tc[i] <== parent_tc[i];
        g4.child_tc[i] <== child_tc[i];
    }
    for (var i = 0; i < N_a; i++) {
        g4.partition_tau[i] <== partition_tau[i];
        g4.partition_tags[i] <== partition_tags[i];
        g4.partition_s[i] <== partition_s[i];
        g4.partition_is_active[i] <== partition_is_active[i];
        g4.depth_parent_partition[i] <== depth_parent_partition[i];
        g4.depth_child_partition[i] <== depth_child_partition[i];
    }
    g4.k_amplification <== k_amplification;

    // ===== G5: 内容标签一致性验证 (~1,104 约束) =====
    // 方案B：G5 独立计算 is_episodic，不依赖 G4 输出
    component g5 = G5TagConsistency(N_a);
    for (var i = 0; i < N_a; i++) {
        g5.partition_tau[i] <== partition_tau[i];
        g5.partition_tags[i] <== partition_tags[i];
        g5.partition_s[i] <== partition_s[i];
        g5.partition_is_active[i] <== partition_is_active[i];
    }

    // ===== G6: 持有者绑定与防重放 (~800 约束) =====
    component g6 = G6HolderBinding();
    g6.h_c <== h_c;
    g6.nullifier <== nullifier;
    g6.child_hld <== child_hld;
    g6.holder_sk <== holder_sk;
    g6.holder_pk_x <== holder_pk_x;
    g6.holder_pk_y <== holder_pk_y;
}

// 主电路实例化
// N_a=16 (scope 分区数), d_s=6 (Merkle 深度)
// 注意：MerkleTreeBuilderWithMask 的 depth=4 = log2(16)
//       如果修改 N_a，必须同步修改 g2_hash.circom 中的 depth
component main {
    public [h_c, pk_issuer, nullifier, current_time]
} = ObliviousDelegation(16, 6);