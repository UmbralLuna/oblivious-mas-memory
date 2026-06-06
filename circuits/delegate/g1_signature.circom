// circuits/delegate/g1_signature.circom
// G1: EdDSA 签名验证（~6,000 约束）
// 规范 v4.0 §4.2.3
//
// 验证父令牌的 EdDSA 签名：
//   msg = Poseidon(iss, hld, scope_root, perm, depth, exp, attr_hash, tc_hash)
//   verify(pk_issuer, msg, sig)

pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "../primitives/eddsa_wrapper.circom";

template G1Signature() {
    // 公共输入
    signal input pk_issuer[2];

    // 私有输入：父令牌字段
    signal input parent_iss;
    signal input parent_hld;
    signal input parent_scope_root;
    signal input parent_perm;
    signal input parent_depth;
    signal input parent_exp;
    signal input parent_attr_hash;
    signal input parent_tc_hash;

    // 私有输入：签名
    signal input sig_R8x;
    signal input sig_R8y;
    signal input sig_S;

    // 输出：父令牌哈希（供后续约束组使用）
    signal output cap_parent_hash;

    // 1. 计算父令牌哈希
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

    // 2. 验证 EdDSA 签名
    component sig_verify = EdDSAVerifier();
    sig_verify.enabled <== 1;
    sig_verify.pubkey_x <== pk_issuer[0];
    sig_verify.pubkey_y <== pk_issuer[1];
    sig_verify.msg <== hash.out;
    sig_verify.sig_r_x <== sig_R8x;
    sig_verify.sig_r_y <== sig_R8y;
    sig_verify.sig_s <== sig_S;
}