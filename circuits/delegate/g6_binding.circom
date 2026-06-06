// circuits/delegate/g6_binding.circom
// G6: 持有者绑定与防重放（~800 约束）
// 规范 v4.0 §4.2.8
//
// G6.1: Nullifier 域分离
//   nullifier = Poseidon(0, holder_sk, h_c)
//
// G6.2: 持有者公钥绑定
//   child_hld = Poseidon(holder_pk_x, holder_pk_y)

pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "circomlib/circuits/poseidon.circom";

template G6HolderBinding() {
    // 公共输入
    signal input h_c;
    signal input nullifier;

    // 私有输入
    signal input child_hld;
    signal input holder_sk;
    signal input holder_pk_x;
    signal input holder_pk_y;

    // ===== G6.1: Nullifier 域分离 =====
    // nf = Poseidon(domain=0, sk, h_c)
    component nf_check = Nullifier();
    nf_check.domain <== 0; // delegate domain
    nf_check.sk <== holder_sk;
    nf_check.h_c <== h_c;

    nullifier === nf_check.out;

    // ===== G6.2: 持有者公钥绑定 =====
    // child_hld = Poseidon(pk_x, pk_y)
    component hld_hash = Poseidon(2);
    hld_hash.inputs[0] <== holder_pk_x;
    hld_hash.inputs[1] <== holder_pk_y;

    child_hld === hld_hash.out;
}