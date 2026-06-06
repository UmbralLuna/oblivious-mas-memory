// circuits/delegate/g5_tags.circom
// G5: 内容标签一致性验证
// 规范 v4.0 §4.2.7
// 方案 B：独立计算 is_episodic
// 修复：拆分非二次约束

pragma circom 2.1.6;

include "../primitives/range_proof.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template G5TagConsistency(N_a) {
    signal input partition_tau[N_a];
    signal input partition_tags[N_a];
    signal input partition_s[N_a];
    signal input partition_is_active[N_a];

    component ep_eq_g5[N_a];
    signal partition_is_episodic[N_a];
    for (var i = 0; i < N_a; i++) {
        ep_eq_g5[i] = IsEqual();
        ep_eq_g5[i].in[0] <== partition_tau[i];
        ep_eq_g5[i].in[1] <== 0;
        partition_is_episodic[i] <== ep_eq_g5[i].out;
    }

    component tag_bits[N_a];
    for (var i = 0; i < N_a; i++) {
        tag_bits[i] = Num2Bits(5);
        tag_bits[i].in <== partition_tags[i];
    }

    component is_sem[N_a];
    signal type_floor_ep[N_a];
    signal type_floor_sem[N_a];
    signal type_floor[N_a];
    signal tag_floor[N_a];
    signal final_floor[N_a];
    signal tag_cs[N_a];
    signal tag_pii[N_a];
    signal sel_tag_pii[N_a];
    signal sel_tag_cs[N_a];
    signal sel_final_tag[N_a];
    signal sel_final_type[N_a];
    component floor_ge_check[N_a];
    component tag_max[N_a];
    component max_comp[N_a];

    for (var i = 0; i < N_a; i++) {
        is_sem[i] = IsEqual();
        is_sem[i].in[0] <== partition_tau[i];
        is_sem[i].in[1] <== 1;

        type_floor_ep[i] <== partition_is_episodic[i] * 179;
        type_floor_sem[i] <== is_sem[i].out * 77;
        type_floor[i] <== type_floor_ep[i] + type_floor_sem[i];

        tag_cs[i] <== tag_bits[i].out[0] * 204;
        tag_pii[i] <== tag_bits[i].out[3] * 230;

        tag_max[i] = GreaterThan(8);
        tag_max[i].in[0] <== tag_pii[i];
        tag_max[i].in[1] <== tag_cs[i];

        sel_tag_pii[i] <== tag_max[i].out * tag_pii[i];
        sel_tag_cs[i] <== (1 - tag_max[i].out) * tag_cs[i];
        tag_floor[i] <== sel_tag_pii[i] + sel_tag_cs[i];

        max_comp[i] = GreaterThan(8);
        max_comp[i].in[0] <== tag_floor[i];
        max_comp[i].in[1] <== type_floor[i];

        sel_final_tag[i] <== max_comp[i].out * tag_floor[i];
        sel_final_type[i] <== (1 - max_comp[i].out) * type_floor[i];
        final_floor[i] <== sel_final_tag[i] + sel_final_type[i];

        floor_ge_check[i] = LessEqualThan(8);
        floor_ge_check[i].a <== final_floor[i];
        floor_ge_check[i].b <== partition_s[i];

        partition_is_active[i] * (1 - floor_ge_check[i].out) === 0;
    }
}
