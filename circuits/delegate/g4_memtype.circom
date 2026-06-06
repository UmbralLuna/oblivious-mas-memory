// circuits/delegate/g4_memtype.circom
// G4: 记忆类型安全约束（~3,220 约束）★ 核心创新 ★
// 规范 v4.0 §4.2.6
//
// G4.1: 类型约束单调收紧（R1）
//   tc_child[t] ≤ tc_parent[t] for t ∈ {episodic, semantic, procedural}
//
// G4.2: 跨组织 episodic 受控传播（R2）
//   cross_org ∧ episodic ∧ ¬sanitized → reject
//
// G4.3: 高敏感 depth 加速递减（R3）
//   depth_diff ≥ ceil(s × k / 256)

pragma circom 2.1.6;

include "../primitives/range_proof.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template G4MemoryTypeSafety(N_a) {
    // 公共输入
    signal input pk_issuer[2];

    // 私有输入：子令牌
    signal input child_iss;

    // 私有输入：类型约束
    signal input parent_tc[3];
    signal input child_tc[3];

    // 私有输入：子 scope 分区
    signal input partition_tau[N_a];
    signal input partition_tags[N_a];
    signal input partition_s[N_a];
    signal input partition_is_active[N_a];

    // 私有输入：depth 信息（用于 R3）
    signal input depth_parent_partition[N_a];
    signal input depth_child_partition[N_a];
    signal input k_amplification;

    // ===== G4.1: 类型约束单调收紧（R1）=====
    // tc 编码：0=deny, 1=restrict, 2=allow
    // 子令牌的策略必须 ≤ 父令牌（更严格或相同）
    component type_leq[3];
    for (var t = 0; t < 3; t++) {
        type_leq[t] = LessEqualThan(8);
        type_leq[t].a <== child_tc[t];
        type_leq[t].b <== parent_tc[t];
        type_leq[t].out === 1;
    }

    // ===== G4.2: 跨组织 episodic 受控传播（R2）=====
    // 计算 org_parent = Poseidon(pk_issuer)
    component org_p_hash = Poseidon(2);
    org_p_hash.inputs[0] <== pk_issuer[0];
    org_p_hash.inputs[1] <== pk_issuer[1];
    signal org_parent <== org_p_hash.out;

    // 计算 org_child = Poseidon(child_iss)
    component org_c_hash = Poseidon(1);
    org_c_hash.inputs[0] <== child_iss;
    signal org_child <== org_c_hash.out;

    // 判断是否跨组织
    component org_eq = IsEqual();
    org_eq.in[0] <== org_parent;
    org_eq.in[1] <== org_child;
    signal cross_org <== 1 - org_eq.out;

    // 从 partition_tau 派生 is_episodic
    component ep_eq[N_a];
    signal partition_is_episodic[N_a];
    for (var i = 0; i < N_a; i++) {
        ep_eq[i] = IsEqual();
        ep_eq[i].in[0] <== partition_tau[i];
        ep_eq[i].in[1] <== 0; // episodic = 0
        partition_is_episodic[i] <== ep_eq[i].out;
    }

    // 从 partition_tags 派生 sanitized（bit 4）
    component tag_decompose[N_a];
    signal partition_sanitized[N_a];
    for (var i = 0; i < N_a; i++) {
        tag_decompose[i] = Num2Bits(5);
        tag_decompose[i].in <== partition_tags[i];
        partition_sanitized[i] <== tag_decompose[i].out[4];
    }

    // R2 约束：cross_org ∧ active ∧ episodic ∧ ¬sanitized → violation = 0
    signal cross_ep[N_a];
    signal cross_ep_active[N_a];
    signal violation[N_a];
    for (var i = 0; i < N_a; i++) {
        cross_ep[i] <== cross_org * partition_is_episodic[i];
        cross_ep_active[i] <== cross_ep[i] * partition_is_active[i];
        violation[i] <== cross_ep_active[i] * (1 - partition_sanitized[i]);
        violation[i] === 0;
    }

    // ===== G4.3: 高敏感 depth 加速递减（R3）=====
    // cost = ceil(s × k / 256)
    // depth_diff = depth_parent - depth_child
    // 约束：cost ≤ depth_diff（仅对活跃分区）
    component cost_calc[N_a];
    component depth_diff_check[N_a];
    signal depth_diff[N_a];

    for (var i = 0; i < N_a; i++) {
        // 计算 cost = ceil(s * k / 256)
        cost_calc[i] = CeilDivPow2(8, 16, 8);
        cost_calc[i].a <== partition_s[i];
        cost_calc[i].k <== k_amplification;

        // 计算 depth_diff
        depth_diff[i] <== depth_parent_partition[i] - depth_child_partition[i];

        // 验证 cost ≤ depth_diff
        depth_diff_check[i] = LessEqualThan(17);
        depth_diff_check[i].a <== cost_calc[i].cost;
        depth_diff_check[i].b <== depth_diff[i];

        // 仅对活跃分区强制约束
        partition_is_active[i] * (1 - depth_diff_check[i].out) === 0;
    }
}