// circuits/primitives/range_proof.circom
// 范围证明 + 比较器
// 规范 v4.0 §4.1.2

pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/**
 * 范围证明：in ∈ [0, 2^n)
 * 通过 Num2Bits 隐式约束
 */
template RangeProof(n) {
    signal input in;
    
    component n2b = Num2Bits(n);
    n2b.in <== in;
}

/**
 * 小于等于：a <= b
 * 返回 1 if a <= b, else 0
 */
template LessEqualThan(n) {
    signal input a;
    signal input b;
    signal output out;
    
    component lt = LessThan(n);
    lt.in[0] <== a;
    lt.in[1] <== b + 1;
    
    out <== lt.out;
}

/**
 * 严格小于：a < b
 * 返回 1 if a < b, else 0
 */
template StrictLessThan(n) {
    signal input a;
    signal input b;
    signal output out;
    
    component lt = LessThan(n);
    lt.in[0] <== a;
    lt.in[1] <== b;
    
    out <== lt.out;
}

/**
 * 大于等于：a >= b
 */
template GreaterEqualThan(n) {
    signal input a;
    signal input b;
    signal output out;
    
    component gt = GreaterThan(n);
    gt.in[0] <== a;
    gt.in[1] <== b - 1;
    
    out <== gt.out;
}

/**
 * 向上取整除法：cost = ceil(a * k / 2^log_scale)
 * 用于 R3 约束：depth_diff >= ceil(s * k / 256)
 * 规范 v4.0 §4.2.6 G4.3
 * 
 * 参数：
 *   n_a: a 的位宽
 *   n_k: k 的位宽
 *   log_scale: scale = 2^log_scale
 */
template CeilDivPow2(n_a, n_k, log_scale) {
    signal input a;
    signal input k;
    signal output cost;
    
    // a * k
    signal sk_product <== a * k;
    
    // a * k + (2^log_scale - 1)
    signal sk_adjusted <== sk_product + (1 << log_scale) - 1;
    
    // cost = sk_adjusted \ 2^log_scale
    // remainder = sk_adjusted % 2^log_scale
    signal remainder;
    cost <-- sk_adjusted \ (1 << log_scale);
    remainder <-- sk_adjusted % (1 << log_scale);
    
    // 约束：cost * 2^log_scale + remainder == sk_adjusted
    signal cost_times_scale <== cost * (1 << log_scale);
    sk_adjusted === cost_times_scale + remainder;
    
    // cost 的范围证明
    component range_cost = RangeProof(n_a + n_k - log_scale + 1);
    range_cost.in <== cost;
    
    // remainder < 2^log_scale
    component range_rem = RangeProof(log_scale);
    range_rem.in <== remainder;
}

/**
 * 等于判断：out = 1 if a == b else 0
 * （便捷包装）
 */
template IsEqualWrapper() {
    signal input a;
    signal input b;
    signal output out;
    
    component eq = IsEqual();
    eq.in[0] <== a;
    eq.in[1] <== b;
    
    out <== eq.out;
}

/**
 * 零判断：out = 1 if in == 0 else 0
 */
template IsZeroWrapper() {
    signal input in;
    signal output out;
    
    component iz = IsZero();
    iz.in <== in;
    
    out <== iz.out;
}

/**
 * Max 函数：out = max(a, b)
 * 用于 G5 的敏感度下界计算
 * 规范 v4.0 §4.2.7
 */
template MaxOf(n) {
    signal input a;
    signal input b;
    signal output out;
    
    // is_a_ge_b = 1 if a >= b else 0
    component ge = GreaterEqualThan(n);
    ge.a <== a;
    ge.b <== b;
    
    // out = is_a_ge_b * a + (1 - is_a_ge_b) * b
    out <== ge.out * a + (1 - ge.out) * b;
}