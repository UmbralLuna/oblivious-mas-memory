// circuits/delegate/g3_traditional.circom
// G3: 传统委托约束（~2,100 约束）
// 规范 v4.0 §4.2.5
//
// G3.1: Scope membership（子分区在父 scope 树中）
// G3.2: Permission subset（child_perm ⊆ parent_perm）
// G3.3: Depth constraint（child_depth < parent_depth）
// G3.4: Expiration constraint（child_exp ≤ parent_exp ∧ current_time < child_exp）

pragma circom 2.1.6;

include "../primitives/conditional_merkle.circom";
include "../primitives/range_proof.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template G3TraditionalConstraints(N_a, d_s) {
    // 私有输入：父令牌字段
    signal input parent_scope_root;
    signal input parent_perm;
    signal input parent_depth;
    signal input parent_exp;

    // 私有输入：子令牌字段
    signal input child_perm;
    signal input child_depth;
    signal input child_exp;

    // 公共输入
    signal input current_time;

    // 私有输入：子分区（从 G2 传递）
    signal input partition_is_active[N_a];
    signal input child_leaf_hashes[N_a];

    // 私有输入：Merkle 路径（在父 scope 树中）
    signal input merkle_paths[N_a][d_s];
    signal input merkle_indices[N_a][d_s];

    // ===== G3.1: Scope membership in PARENT tree =====
    component scope_check[N_a];
    for (var i = 0; i < N_a; i++) {
        scope_check[i] = ConditionalMerkleChecker(d_s);
        scope_check[i].enabled <== partition_is_active[i];
        scope_check[i].leaf <== child_leaf_hashes[i];
        scope_check[i].root <== parent_scope_root;
        for (var j = 0; j < d_s; j++) {
            scope_check[i].pathElements[j] <== merkle_paths[i][j];
            scope_check[i].pathIndices[j] <== merkle_indices[i][j];
        }
    }

    // ===== G3.2: Permission subset (bitwise) =====
    // child_perm[i] = 1 → parent_perm[i] must be 1
    component perm_bits_p = Num2Bits(32);
    perm_bits_p.in <== parent_perm;

    component perm_bits_c = Num2Bits(32);
    perm_bits_c.in <== child_perm;

    for (var i = 0; i < 32; i++) {
        // child has bit → parent must also have bit
        perm_bits_c.out[i] * (1 - perm_bits_p.out[i]) === 0;
    }

    // ===== G3.3: depth_child < depth_parent =====
    component depth_check = StrictLessThan(8);
    depth_check.a <== child_depth;
    depth_check.b <== parent_depth;
    depth_check.out === 1;

    // ===== G3.4: Expiration constraints =====
    // exp_child <= exp_parent
    component exp_check1 = LessEqualThan(64);
    exp_check1.a <== child_exp;
    exp_check1.b <== parent_exp;
    exp_check1.out === 1;

    // current_time < exp_child（令牌未过期）
    component exp_check2 = StrictLessThan(64);
    exp_check2.a <== current_time;
    exp_check2.b <== child_exp;
    exp_check2.out === 1;
}