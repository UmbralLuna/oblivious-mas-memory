pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "../primitives/eddsa_wrapper.circom";
include "../primitives/merkle_tree.circom";
include "../primitives/range_proof.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template WritePlaintextId(d_s) {
    signal input h_w;
    signal input id_writer;
    signal input rt_scope;
    signal input M_target;
    signal input tau_target;
    signal input pk_issuer[2];
    signal input nullifier_w;
    signal input current_time;

    signal input cap_iss;
    signal input cap_hld;
    signal input cap_scope_root;
    signal input cap_perm;
    signal input cap_depth;
    signal input cap_exp;
    signal input cap_attr_hash;
    signal input cap_tc_hash;
    signal input cap_tc[3];

    signal input sig_R8x;
    signal input sig_R8y;
    signal input sig_S;

    signal input target_tags;
    signal input target_s;
    signal input merkle_path[d_s];
    signal input merkle_index[d_s];

    signal input r_pedersen;
    signal input H_x;
    signal input H_y;

    signal input holder_sk;
    signal input holder_pk_x;
    signal input holder_pk_y;
    signal input randomness_h;

    component cap_hash = HashCapability();
    cap_hash.iss <== cap_iss; cap_hash.hld <== cap_hld;
    cap_hash.scope_root <== cap_scope_root; cap_hash.perm <== cap_perm;
    cap_hash.depth <== cap_depth; cap_hash.exp <== cap_exp;
    cap_hash.attr_hash <== cap_attr_hash; cap_hash.tc_hash <== cap_tc_hash;

    component sig_verify = EdDSAVerifier();
    sig_verify.enabled <== 1;
    sig_verify.pubkey_x <== pk_issuer[0]; sig_verify.pubkey_y <== pk_issuer[1];
    sig_verify.msg <== cap_hash.out;
    sig_verify.sig_r_x <== sig_R8x; sig_verify.sig_r_y <== sig_R8y;
    sig_verify.sig_s <== sig_S;

    component perm_bits = Num2Bits(32);
    perm_bits.in <== cap_perm;
    perm_bits.out[1] === 1;

    component target_leaf = Poseidon(4);
    target_leaf.inputs[0] <== M_target; target_leaf.inputs[1] <== tau_target;
    target_leaf.inputs[2] <== target_tags; target_leaf.inputs[3] <== target_s;

    component merkle_check = MerkleTreeChecker(d_s);
    merkle_check.leaf <== target_leaf.out;
    merkle_check.root <== cap_scope_root;
    for (var i = 0; i < d_s; i++) {
        merkle_check.pathElements[i] <== merkle_path[i];
        merkle_check.pathIndices[i] <== merkle_index[i];
    }
    rt_scope === cap_scope_root;

    component is_tau_0 = IsEqual();
    is_tau_0.in[0] <== tau_target; is_tau_0.in[1] <== 0;
    component is_tau_1 = IsEqual();
    is_tau_1.in[0] <== tau_target; is_tau_1.in[1] <== 1;
    component is_tau_2 = IsEqual();
    is_tau_2.in[0] <== tau_target; is_tau_2.in[1] <== 2;

    signal sel_tc_0 <== is_tau_0.out * cap_tc[0];
    signal sel_tc_1 <== is_tau_1.out * cap_tc[1];
    signal sel_tc_2 <== is_tau_2.out * cap_tc[2];
    signal selected_tc <== sel_tc_0 + sel_tc_1 + sel_tc_2;

    component tc_ge = GreaterEqThan(8);
    tc_ge.in[0] <== selected_tc; tc_ge.in[1] <== 1;
    tc_ge.out === 1;

    component id_check = Poseidon(2);
    id_check.inputs[0] <== holder_pk_x;
    id_check.inputs[1] <== holder_pk_y;
    id_writer === id_check.out;

    component h_w_check = HashWriteRequest();
    h_w_check.M_target <== M_target; h_w_check.tau_target <== tau_target;
    h_w_check.C_w_x <== id_writer;
    h_w_check.C_w_y <== 0;
    h_w_check.randomness <== randomness_h;
    h_w === h_w_check.out;

    component nf_check = Nullifier();
    nf_check.domain <== 1; nf_check.sk <== holder_sk; nf_check.h_c <== h_w;
    nullifier_w === nf_check.out;

    component hld_check = Poseidon(2);
    hld_check.inputs[0] <== holder_pk_x; hld_check.inputs[1] <== holder_pk_y;
    cap_hld === hld_check.out;

    component exp_check = StrictLessThan(64);
    exp_check.a <== current_time; exp_check.b <== cap_exp;
    exp_check.out === 1;
}

component main {
    public [h_w, id_writer, rt_scope, M_target, tau_target, pk_issuer, nullifier_w, current_time]
} = WritePlaintextId(6);
