// circuits/write/write_provenance.circom
// C_write来源证明电路（~10,100 约束）
// 规范v4.0 §4.3
//
// W1: EdDSA 签名验证（~6,000 约束）
// W2: 写权限位检查（~32 约束）
// W3: Merkle 分区授权（~1,500 约束）
// W4: 记忆类型约束（~64 约束）
// W5: Pedersen 身份承诺（~800 约束）
// W6: Poseidon 哈希一致性 + Nullifier + 持有者绑定（~500 约束）
// W7:脱敏操作结构验证（~1,200 约束）
//S1: 长度约束 |Sanitize(m)| <= 0.8* |m|
//     S2: 熵降低约束 H(Sanitize(m)) <= 0.6 * H(m)
//     S3: 模式匹配约束（无PII模式）

pragma circom 2.1.6;

include "../primitives/poseidon_wrapper.circom";
include "../primitives/eddsa_wrapper.circom";
include "../primitives/pedersen_wrapper.circom";
include "../primitives/merkle_tree.circom";
include "../primitives/range_proof.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

//===== W7子模板：S1 长度约束 (~200 约束) =====
// 验证 sanitized_len <= 0.8 * original_len
// 等价于 5 * sanitized_len <= 4 * original_len
template SanitizeLengthCheck() {
    signal input original_len;    // 原始文本长度（字符数，8位量化）
    signal input sanitized_len;   // 脱敏后文本长度（字符数，8位量化）
    signal output valid;

    // 5 * sanitized_len <= 4 * original_len
    signal lhs <== 5 * sanitized_len;
    signal rhs <== 4 * original_len;

    component le = LessEqThan(16);
    le.in[0] <== lhs;
    le.in[1] <== rhs;
    valid <== le.out;
}

// ===== W7 子模板：S2 熵降低约束 (~400 约束) =====
// 验证 H(sanitized) <= 0.6 * H(original)
// 熵用8位定点数表示（精度1/256），范围[0, 255]
// 等价于 5 * H_sanitized <= 3 * H_original
template SanitizeEntropyCheck() {
    signal input H_original;    // 原始文本熵（8位量化，0-255）
    signal input H_sanitized;   // 脱敏后文本熵（8位量化，0-255）
    signal output valid;

    // 5 * H_sanitized <= 3 * H_original
    signal lhs <== 5 * H_sanitized;
    signal rhs <== 3 * H_original;

    component le = LessEqThan(16);
    le.in[0] <== lhs;
    le.in[1] <== rhs;
    valid <== le.out;
}

// ===== W7 子模板：S3 模式匹配约束 (~600 约束) =====
// 验证脱敏后文本不包含PII模式
// 使用4个模式标志位（0=不含，1=含）
// pii_flags: bit0=email, bit1=phone, bit2=timestamp, bit3=amount
template SanitizePatternCheck() {
    signal input pii_flags;     // PII模式标志（4位位向量）
    signal output valid;

    // 解析4个标志位
    component bits = Num2Bits(4);
    bits.in <== pii_flags;

    // 所有标志位必须为0（不含任何PII模式）
    signal no_email<== 1 - bits.out[0];
    signal no_phone <== 1 - bits.out[1];
    signal no_timestamp <== 1 - bits.out[2];
    signal no_amount <== 1 - bits.out[3];

    // 四个条件同时满足
    signal check_01 <== no_email * no_phone;
    signal check_23 <== no_timestamp * no_amount;
    valid <== check_01 * check_23;
}

// ===== W7 主模板：脱敏验证 (~1,200 约束) =====
// 仅对跨部门情景记忆（cross_org=1 且 tau=episodic=0）启用验证
template SanitizeVerifier() {
    signal input cross_org;         // 是否跨部门（0/1）
    signal input tau_target;        // 记忆类型（0=episodic）
    signal input original_len;      // 原始文本长度
    signal input sanitized_len;     // 脱敏后文本长度
    signal input H_original;        // 原始文本熵
    signal input H_sanitized;       // 脱敏后文本熵
    signal input pii_flags;         // PII模式标志
    signal output valid;// 验证结果

    // 判断是否为跨部门情景记忆
    component is_episodic = IsEqual();
    is_episodic.in[0] <== tau_target;
    is_episodic.in[1] <== 0;

    // requires_sanitize = cross_org * is_episodic
    signal requires_sanitize <== cross_org * is_episodic.out;

    // S1: 长度约束
    component s1 = SanitizeLengthCheck();
    s1.original_len <== original_len;
    s1.sanitized_len <== sanitized_len;

    // S2: 熵降低约束
    component s2 = SanitizeEntropyCheck();
    s2.H_original <== H_original;
    s2.H_sanitized <== H_sanitized;

    // S3: 模式匹配约束
    component s3 = SanitizePatternCheck();
    s3.pii_flags <== pii_flags;

    // 三个约束同时满足
    signal s1_s2 <== s1.valid * s2.valid;
    signal all_valid <== s1_s2 * s3.valid;

    // 如果需要脱敏验证，则all_valid 必须为1
    // 等价于：requires_sanitize * (1 - all_valid) = 0
    signal violation<== requires_sanitize * (1 - all_valid);
    violation === 0;

    // 输出验证结果
    valid <== 1 - violation;
}

template WriteProvenance(d_s) {
    //===== 公共输入 =====
    signal input h_w;// 写入请求哈希
    signal input C_w[2];               // Pedersen 承诺 (x, y)
    signal input rt_scope;             // Scope Merkle 根
    signal input M_target;             // 目标分区标识符
    signal input tau_target;           // 目标分区类型
    signal input pk_issuer[2];         // 发证者公钥
    signal input nullifier_w;          // Nullifier（防重放）
    signal input current_time;         // 当前时间戳

    // ===== 私有输入：能力令牌 =====
    signal input cap_iss;
    signal input cap_hld;
    signal input cap_scope_root;
    signal input cap_perm;
    signal input cap_depth;
    signal input cap_exp;
    signal input cap_attr_hash;
    signal input cap_tc_hash;
    signal input cap_tc[3];

    // ===== 私有输入：签名 =====
    signal input sig_R8x;
    signal input sig_R8y;
    signal input sig_S;

    // ===== 私有输入：目标分区 =====
    signal input target_tags;
    signal input target_s;
    signal input merkle_path[d_s];
    signal input merkle_index[d_s];

    // ===== 私有输入：Pedersen 承诺 =====
    signal input id_writer;
    signal input r_pedersen;
    signal input H_x;
    signal input H_y;

    // ===== 私有输入：持有者 =====
    signal input holder_sk;
    signal input holder_pk_x;
    signal input holder_pk_y;
    signal input randomness_h;

    // ===== 私有输入：W7 脱敏验证 =====
    signal input cross_org;         // 是否跨部门（0/1）
    signal input original_len;      // 原始文本长度（8位量化）
    signal input sanitized_len;     // 脱敏后文本长度（8位量化）
    signal input H_original;        // 原始文本熵（8位量化）
    signal input H_sanitized;       // 脱敏后文本熵（8位量化）
    signal input pii_flags;         // PII模式标志（4位）

    // ===== W1: EdDSA 签名验证 (~6,000 约束) =====
    component cap_hash = HashCapability();
    cap_hash.iss <== cap_iss;
    cap_hash.hld <== cap_hld;
    cap_hash.scope_root <== cap_scope_root;
    cap_hash.perm <== cap_perm;
    cap_hash.depth <== cap_depth;
    cap_hash.exp <== cap_exp;
    cap_hash.attr_hash <== cap_attr_hash;
    cap_hash.tc_hash <== cap_tc_hash;

    component sig_verify = EdDSAVerifier();
    sig_verify.enabled <== 1;
    sig_verify.pubkey_x <== pk_issuer[0];
    sig_verify.pubkey_y <== pk_issuer[1];
    sig_verify.msg <== cap_hash.out;
    sig_verify.sig_r_x <== sig_R8x;
    sig_verify.sig_r_y <== sig_R8y;
    sig_verify.sig_s <== sig_S;

    // ===== W2: 写权限位检查 (~32 约束) =====
    component perm_bits = Num2Bits(32);
    perm_bits.in <== cap_perm;
    perm_bits.out[1] === 1;

    // ===== W3: Merkle 分区授权 (~1,500 约束) =====
    component target_leaf = Poseidon(4);
    target_leaf.inputs[0] <== M_target;
    target_leaf.inputs[1] <== tau_target;
    target_leaf.inputs[2] <== target_tags;
    target_leaf.inputs[3] <== target_s;

    component merkle_check = MerkleTreeChecker(d_s);
    merkle_check.leaf <== target_leaf.out;
    merkle_check.root <== cap_scope_root;
    for (var i = 0; i < d_s; i++) {
        merkle_check.pathElements[i] <== merkle_path[i];
        merkle_check.pathIndices[i] <== merkle_index[i];
    }
    rt_scope === cap_scope_root;

    // ===== W4: 记忆类型约束 (~64 约束) =====
    component is_tau_0 = IsEqual();
    is_tau_0.in[0] <== tau_target;
    is_tau_0.in[1] <== 0;

    component is_tau_1 = IsEqual();
    is_tau_1.in[0] <== tau_target;
    is_tau_1.in[1] <== 1;

    component is_tau_2 = IsEqual();
    is_tau_2.in[0] <== tau_target;
    is_tau_2.in[1] <== 2;

    signal sel_tc_0 <== is_tau_0.out * cap_tc[0];
    signal sel_tc_1 <== is_tau_1.out * cap_tc[1];
    signal sel_tc_2 <== is_tau_2.out * cap_tc[2];
    signal selected_tc <== sel_tc_0 + sel_tc_1 + sel_tc_2;

    component tc_ge = GreaterEqThan(8);
    tc_ge.in[0] <== selected_tc;
    tc_ge.in[1] <== 1;
    tc_ge.out === 1;

    // ===== W5: Pedersen 身份承诺 (~800 约束) =====
    component pedersen = PedersenCommit();
    pedersen.id <== id_writer;
    pedersen.r <== r_pedersen;
    pedersen.H_x <== H_x;
    pedersen.H_y <== H_y;
    C_w[0] === pedersen.C[0];
    C_w[1] === pedersen.C[1];

    component id_check = Poseidon(2);
    id_check.inputs[0] <== holder_pk_x;
    id_check.inputs[1] <== holder_pk_y;
    id_writer === id_check.out;

    // ===== W6:哈希一致性 + Nullifier + 持有者绑定 (~500 约束) =====
    component h_w_check = HashWriteRequest();
    h_w_check.M_target <== M_target;
    h_w_check.tau_target <== tau_target;
    h_w_check.C_w_x <== C_w[0];
    h_w_check.C_w_y <== C_w[1];
    h_w_check.randomness<== randomness_h;
    h_w === h_w_check.out;

    component nf_check = Nullifier();
    nf_check.domain <== 1;
    nf_check.sk <== holder_sk;
    nf_check.h_c <== h_w;
    nullifier_w === nf_check.out;

    component hld_check = Poseidon(2);
    hld_check.inputs[0] <== holder_pk_x;
    hld_check.inputs[1] <== holder_pk_y;
    cap_hld === hld_check.out;

    component exp_check = StrictLessThan(64);
    exp_check.a <== current_time;
    exp_check.b <== cap_exp;
    exp_check.out === 1;

    // ===== W7: 脱敏操作结构验证 (~1,200 约束) =====
    component w7 = SanitizeVerifier();
    w7.cross_org <== cross_org;
    w7.tau_target <== tau_target;
    w7.original_len <== original_len;
    w7.sanitized_len <== sanitized_len;
    w7.H_original <== H_original;
    w7.H_sanitized <== H_sanitized;
    w7.pii_flags <== pii_flags;
}

component main {
    public [h_w, C_w, rt_scope, M_target, tau_target, pk_issuer, nullifier_w, current_time]
} = WriteProvenance(6);
