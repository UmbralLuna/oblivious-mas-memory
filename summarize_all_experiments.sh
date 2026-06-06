#!/bin/bash

echo "=========================================="
echo "  补充实验结果汇总"
echo "=========================================="

echo ""
echo "=== 实验1: 调研数据详细化 ==="
echo "文件: analysis/survey/survey_analysis.xlsx"
python3 << 'PY'
import json
with open('analysis/survey/survey_raw_data.json') as f:
    data = json.load(f)
print(f"✓ 总任务数: {len(data['tasks'])}")
print(f"✓ 企业数量: {len(data['companies'])}")
tolerable = sum(1 for t in data['tasks'] if t['can_tolerate'])
print(f"✓ 可容忍2-5秒延迟: {tolerable}/{len(data['tasks'])} ({tolerable/len(data['tasks'])*100:.1f}%)")
PY

echo ""
echo "=== 实验2: MPC Setup性能测试 ==="
echo "文件: experiments/mpc_setup/mpc_setup_results.xlsx"
python3 << 'PY'
import json
import glob
results = []
for file in sorted(glob.glob('experiments/mpc_setup/results/result_*.json')):
    with open(file) as f:
        results.append(json.load(f))
print("部门数量 | Setup时间 | 网络传输 | 验证时间")
print("---------|-----------|---------|----------")
for r in results:
    print(f"{r['parties']:8} | {r['total_time_minutes']:.1f}分钟   | {r['transfer_size_gb']:.2f}GB   | {r['verify_time_seconds']}秒")
PY

echo ""
echo "=== 实验3: 脱敏验证有效性测试 ==="
echo "文件: experiments/sanitization_validation/test_results.json"
python3 << 'PY'
import json
with open('experiments/sanitization_validation/test_results.json') as f:
    data = json.load(f)
print(f"✓ 不合格脱敏检测率: {data['detection_rate']:.1f}%")
print(f"✓ 边界情况漏报率: {data['miss_rate']:.1f}%")
print(f"✓ 总体有效性: {data['overall_effectiveness']:.1f}%")
PY

echo ""
echo "=========================================="
echo "  ✅ 所有补充实验完成！"
echo "=========================================="
echo ""
echo "生成的文件:"
echo "  1. analysis/survey/survey_analysis.xlsx"
echo "  2. experiments/mpc_setup/mpc_setup_results.xlsx"
echo "  3. experiments/sanitization_validation/test_results.json"
echo ""
echo "这些数据可以直接用于论文修改！"
