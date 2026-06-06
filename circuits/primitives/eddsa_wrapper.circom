// circuits/primitives/eddsa_wrapper.circom
// EdDSA 签名验证包装
// 规范 v4.0 §4.1.5

pragma circom 2.1.6;

include "circomlib/circuits/eddsaposeidon.circom";

/**
 * EdDSA 签名验证器（基于 Poseidon 哈希）
 * 
 * 输入：
 *   enabled: 1=强制验证, 0=跳过（用于条件验证）
 *   pubkey_x, pubkey_y: 发证者公钥点
 *   msg: 被签名的消息（通常是 Poseidon 哈希）
 *   sig_r_x, sig_r_y: 签名 R8 点
 *   sig_s: 签名 S 标量
 * 
 * 行为：
 *   enabled = 1: 签名必须有效，否则电路失败
 *   enabled = 0: 不验证
 */
template EdDSAVerifier() {
    signal input enabled;
    signal input pubkey_x;
    signal input pubkey_y;
    signal input msg;
    signal input sig_r_x;
    signal input sig_r_y;
    signal input sig_s;
    
    // 约束 enabled 为二进制
    enabled * (1 - enabled) === 0;
    
    component verifier = EdDSAPoseidonVerifier();
    verifier.enabled <== enabled;
    verifier.Ax <== pubkey_x;
    verifier.Ay <== pubkey_y;
    verifier.M <== msg;
    verifier.R8x <== sig_r_x;
    verifier.R8y <== sig_r_y;
    verifier.S <== sig_s;
}