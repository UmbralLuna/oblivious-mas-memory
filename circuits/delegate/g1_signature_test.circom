// circuits/delegate/g1_signature_test.circom
// G1 测试版：enabled = 0（跳过 EdDSA 验证）

pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "../primitives/eddsa_wrapper.circom";

template G1SignatureTest() {
    signal input pk_issuer[2];
    signal input parent_iss;
    signal input parent_hld;
    signal input parent_scope_root;
    signal input parent_perm;
    signal input parent_depth;
    signal input parent_exp;
    signal input parent_attr_hash;
    signal input parent_tc_hash;
    signal input sig_R8x;
    signal input sig_R8y;
    signal input sig_S;

    signal output cap_parent_hash;

    component hash = HashCapability();
    hash.iss <== parent_iss;
    hash.hld <== parent_hld;
    hash.scope_root <== parent_scope_root;
    hash.perm <== parent_perm;
    hash.depth <== parent_depth;
    hash.exp <== parent_exp;
    hash.attr_hash <== parent_attr_hash;
    hash.tc_hash <== parent_tc_hash;

    cap_parent_hash <== hash.out;

    // *** 测试模式：enabled = 0（跳过 EdDSA 验证）***
    component sig_verify = EdDSAVerifier();
    sig_verify.enabled <== 0;  // ← 关键修改
    sig_verify.pubkey_x <== pk_issuer[0];
    sig_verify.pubkey_y <== pk_issuer[1];
    sig_verify.msg <== hash.out;
    sig_verify.sig_r_x <== sig_R8x;
    sig_verify.sig_r_y <== sig_R8y;
    sig_verify.sig_s <== sig_S;
}
