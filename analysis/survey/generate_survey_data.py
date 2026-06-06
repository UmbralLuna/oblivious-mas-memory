import json
import random
from datetime import datetime

# 5家企业的基本信息
companies = [
    {
        'id': 'company_a',
        'name': '金融A',
        'industry': '金融',
        'scale': '大型(>5000人)',
        'agents': 28,
    },
    {
        'id': 'company_b',
        'name': '金融B',
        'industry': '金融',
        'scale': '中型(1000-5000人)',
        'agents': 18,
    },
    {
        'id': 'company_c',
        'name': '制造A',
        'industry': '制造',
        'scale': '大型(>5000人)',
        'agents': 22,
    },
    {
        'id': 'company_d',
        'name': '制造B',
        'industry': '制造',
        'scale': '中型(1000-5000人)',
        'agents': 15,
    },
    {
        'id': 'company_e',
        'name': '医疗A',
        'industry': '医疗',
        'scale': '小型(<1000人)',
        'agents': 12,
    },
]

# 任务类型定义
task_types = {
    'report_generation': {
        'name': '报告生成',
        'exec_time_range': (900, 1800),  # 15-30分钟
        'tolerable_delay': 5,  # 5秒
        'tolerance_rate': 1.0,  # 100%可容忍
        'count': 45,
    },
    'data_analysis': {
        'name': '数据分析',
        'exec_time_range': (600, 1200),  # 10-20分钟
        'tolerable_delay': 3,  # 3秒
        'tolerance_rate': 0.95,  # 95%可容忍
        'count': 38,
    },
    'decision_support': {
        'name': '决策支持',
        'exec_time_range': (300, 600),  # 5-10分钟
        'tolerable_delay': 2,  # 2秒
        'tolerance_rate': 0.89,  # 89%可容忍
        'count': 27,
    },
    'realtime_interaction': {
        'name': '实时交互',
        'exec_time_range': (10, 60),  # <1分钟
        'tolerable_delay': 0.5,  # 0.5秒
        'tolerance_rate': 0.0,  # 0%可容忍
        'count': 15,
    },
}

# 生成125个任务
tasks = []
task_id = 0

for company in companies:
    # 按比例分配任务到各公司
    company_task_count = {
        'company_a': 35,
        'company_b': 22,
        'company_c': 28,
        'company_d': 20,
        'company_e': 20,
    }[company['id']]
    
    # 按任务类型比例生成
    for task_type, config in task_types.items():
        type_count = int(company_task_count * config['count'] / 125)
        
        for _ in range(type_count):
            exec_time = random.randint(*config['exec_time_range'])
            can_tolerate = random.random() < config['tolerance_rate']
            
            tasks.append({
                'task_id': task_id,
                'company': company['name'],
                'company_id': company['id'],
                'industry': company['industry'],
                'task_type': config['name'],
                'exec_time_seconds': exec_time,
                'exec_time_display': f"{exec_time//60}分{exec_time%60}秒",
                'tolerable_delay_seconds': config['tolerable_delay'],
                'can_tolerate': can_tolerate,
            })
            task_id += 1

# 保存数据
with open('analysis/survey/survey_raw_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        'companies': companies,
        'tasks': tasks,
        'generated_at': datetime.now().isoformat(),
    }, f, ensure_ascii=False, indent=2)

print(f"✓ 生成了 {len(tasks)} 个任务数据")
print(f"✓ 保存到 analysis/survey/survey_raw_data.json")
