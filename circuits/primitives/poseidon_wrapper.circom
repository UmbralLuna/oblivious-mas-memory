// circuits/primitives/poseidon_wrapper.circom
// Poseidon 哈希函数包装
// 规范 v4.0 §4.1.1

pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

/**
 * Capability 哈希（8 字段）
 * 对应论文 Definition 1:
 * cap = (iss, hld, scope_root, perm, depth, exp, attr_hash, tc_hash)
 */
template HashCapability() {
    signal input iss;
    signal input hld;
    signal input scope_root;
    signal input perm;
    signal input depth;
    signal input exp;
    signal input attr_hash;
    signal input tc_hash;
    signal output out;
    
    component h = Poseidon(8);
    h.inputs[0] <== iss;
    h.inputs[1] <== hld;
    h.inputs[2] <== scope_root;
    h.inputs[3] <== perm;
    h.inputs[4] <== depth;
    h.inputs[5] <== exp;
    h.inputs[6] <== attr_hash;
    h.inputs[7] <== tc_hash;
    
    out <== h.out;
}

/**
 * Capability 带随机数哈希（9 字段）
 * 用于 h_c = Poseidon(cap || r)
 */
template HashCapabilityWithRandomness() {
    signal input iss;
    signal input hld;
    signal input scope_root;
    signal input perm;
    signal input depth;
    signal input exp;
    signal input attr_hash;
    signal input tc_hash;
    signal input randomness;
    signal output out;
    
    component h = Poseidon(9);
    h.inputs[0] <== iss;
    h.inputs[1] <== hld;
    h.inputs[2] <== scope_root;
    h.inputs[3] <== perm;
    h.inputs[4] <== depth;
    h.inputs[5] <== exp;
    h.inputs[6] <== attr_hash;
    h.inputs[7] <== tc_hash;
    h.inputs[8] <== randomness;
    
    out <== h.out;
}

/**
 * Nullifier 生成
 * nf = Poseidon(domain, sk, h_c)
 * domain: 0=delegate, 1=write
 * 规范 v4.0 §4.2.8
 */
template Nullifier() {
    signal input domain;
    signal input sk;
    signal input h_c;
    signal output out;
    
    component h = Poseidon(3);
    h.inputs[0] <== domain;
    h.inputs[1] <== sk;
    h.inputs[2] <== h_c;
    
    out <== h.out;
}

/**
 * TypeConstraint 哈希
 * tc_hash = Poseidon(tc_episodic, tc_semantic, tc_procedural)
 */
template HashTypeConstraint() {
    signal input tc[3];
    signal output out;
    
    component h = Poseidon(3);
    h.inputs[0] <== tc[0];
    h.inputs[1] <== tc[1];
    h.inputs[2] <== tc[2];
    
    out <== h.out;
}

/**
 * Partition 叶子哈希
 * leaf = Poseidon(M, tau, tags, s)
 */
template HashPartitionLeaf() {
    signal input M;
    signal input tau;
    signal input tags;
    signal input s;
    signal output out;
    
    component h = Poseidon(4);
    h.inputs[0] <== M;
    h.inputs[1] <== tau;
    h.inputs[2] <== tags;
    h.inputs[3] <== s;
    
    out <== h.out;
}

/**
 * Write 哈希（5 字段）
 * h_w = Poseidon(M_target, tau_target, C_w_x, C_w_y, randomness)
 */
template HashWriteRequest() {
    signal input M_target;
    signal input tau_target;
    signal input C_w_x;
    signal input C_w_y;
    signal input randomness;
    signal output out;
    
    component h = Poseidon(5);
    h.inputs[0] <== M_target;
    h.inputs[1] <== tau_target;
    h.inputs[2] <== C_w_x;
    h.inputs[3] <== C_w_y;
    h.inputs[4] <== randomness;
    
    out <== h.out;
}