import json
import pandas as pd

# 读取原始数据
with open('analysis/survey/survey_raw_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

tasks = pd.DataFrame(data['tasks'])
companies = pd.DataFrame(data['companies'])

# 表1: 任务类型分布
print("=" * 60)
print("表1: 调研数据详情")
print("=" * 60)

task_summary = tasks.groupby('task_type').agg({
    'task_id': 'count',
    'exec_time_seconds': ['min', 'max'],
    'tolerable_delay_seconds': 'first',
    'can_tolerate': 'mean',
}).round(2)

task_summary.columns = ['数量', '最短执行时间(秒)', '最长执行时间(秒)', '可容忍延迟(秒)', '容忍率']
task_summary['占比'] = (task_summary['数量'] / len(tasks) * 100).round(1).astype(str) + '%'
task_summary['执行时间范围'] = task_summary.apply(
    lambda x: f"{int(x['最短执行时间(秒)'])//60}-{int(x['最长执行时间(秒)'])//60}分钟", 
    axis=1
)
task_summary['容忍率'] = (task_summary['容忍率'] * 100).round(0).astype(int).astype(str) + '%'

print(task_summary[['数量', '占比', '执行时间范围', '可容忍延迟(秒)', '容忍率']].to_markdown())

# 表2: 企业分布
print("\n" + "=" * 60)
print("表2: 调研企业分布")
print("=" * 60)

company_tasks = tasks.groupby('company_id').size().to_dict()
companies['任务数量'] = companies['id'].map(company_tasks)

print(companies[['name', 'industry', 'scale', 'agents', '任务数量']].rename(columns={
    'name': '企业',
    'industry': '行业',
    'scale': '规模',
    'agents': '智能体数量',
}).to_markdown(index=False))

# 关键统计
print("\n" + "=" * 60)
print("关键统计")
print("=" * 60)

total_tasks = len(tasks)
tolerable_tasks = tasks[tasks['can_tolerate']].shape[0]
tolerable_rate = tolerable_tasks / total_tasks * 100

print(f"总任务数: {total_tasks}")
print(f"可容忍2-5秒延迟的任务数: {tolerable_tasks}")
print(f"可容忍率: {tolerable_rate:.1f}%")

# 保存为Excel
with pd.ExcelWriter('analysis/survey/survey_analysis.xlsx') as writer:
    task_summary.to_excel(writer, sheet_name='任务类型分布')
    companies[['name', 'industry', 'scale', 'agents', '任务数量']].to_excel(
        writer, sheet_name='企业分布', index=False
    )

print(f"\n✓ 分析结果保存到 analysis/survey/survey_analysis.xlsx")
