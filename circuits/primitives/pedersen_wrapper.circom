// circuits/primitives/pedersen_wrapper.circom
// Pedersen 承诺包装
// 规范 v4.0 §4.1.4
//
// 承诺形式：C = id * G + r * H
//   G: BabyJubJub 标准基点（BASE8）
//   H: nothing-up-my-sleeve 点（运行时传入）

pragma circom 2.1.6;

include "circomlib/circuits/escalarmulfix.circom";
include "circomlib/circuits/escalarmulany.circom";
include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/bitify.circom";

/**
 * Pedersen 承诺：C = id * G + r * H
 * 
 * 输入：
 *   id: 被隐藏的身份（253-bit 标量）
 *   r: 随机数/blinding factor（253-bit 标量）
 *   H_x, H_y: 公共的 H 点坐标
 * 
 * 输出：
 *   C[2]: 承诺点 (x, y)
 */
template PedersenCommit() {
    signal input id;
    signal input r;
    signal input H_x;
    signal input H_y;
    signal output C[2];
    
    // BabyJubJub Base8 点（BASE8 标准生成元）
    // 来源：circomlib/circuits/babyjub.circom
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    
    // id * G（固定基点标量乘法）
    component id_bits = Num2Bits(253);
    id_bits.in <== id;
    
    component idG = EscalarMulFix(253, BASE8);
    for (var i = 0; i < 253; i++) {
        idG.e[i] <== id_bits.out[i];
    }
    
    // r * H（任意基点标量乘法）
    component r_bits = Num2Bits(253);
    r_bits.in <== r;
    
    component rH = EscalarMulAny(253);
    for (var i = 0; i < 253; i++) {
        rH.e[i] <== r_bits.out[i];
    }
    rH.p[0] <== H_x;
    rH.p[1] <== H_y;
    
    // C = idG + rH
    component add = BabyAdd();
    add.x1 <== idG.out[0];
    add.y1 <== idG.out[1];
    add.x2 <== rH.out[0];
    add.y2 <== rH.out[1];
    
    C[0] <== add.xout;
    C[1] <== add.yout;
}