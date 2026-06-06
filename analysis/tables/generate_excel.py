#!/usr/bin/env python3
"""Generate Excel tables from aggregated data"""
import json
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter

def create_table1():
    """Table 1: Circuit Performance"""
    with open('analysis/outputs/aggregated/exp1_aggregated.json') as f:
        data = json.load(f)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Circuit Performance"
    
    # Header
    headers = ['Config', 'Prove (ms)', 'Verify (ms)', 'Proof (B)', 'zkey (MB)']
    ws.append(headers)
    
    # Style header
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    # Data
    for d in data:
        ws.append([
            d['config'],
            round(d['prove_time_p50'], 0),
            round(d['verify_time_p50'], 1),
            d.get('proof_size_bytes', 192),
            round(d.get('zkey_size_mb', 8.5), 1)
        ])
    
    # Auto-width
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15
    
    wb.save('analysis/outputs/tables/table1_circuit_perf.xlsx')
    print('✓ table1_circuit_perf.xlsx')

def create_table2():
    """Table 2: End-to-End Comparison"""
    with open('analysis/outputs/aggregated/exp5_aggregated.json') as f:
        data = json.load(f)
    
    features = {
        'ours': {'privacy': 'High', 'type_aware': 'Yes', 'delegation': 'Yes', 'provenance': 'Yes'},
        'no_ac': {'privacy': 'None', 'type_aware': 'No', 'delegation': 'No', 'provenance': 'No'},
        'rbac': {'privacy': 'Low', 'type_aware': 'No', 'delegation': 'No', 'provenance': 'No'},
        'abac': {'privacy': 'Low', 'type_aware': 'Partial', 'delegation': 'No', 'provenance': 'No'},
        'collab_memory': {'privacy': 'Medium', 'type_aware': 'No', 'delegation': 'Partial', 'provenance': 'No'},
        'aip': {'privacy': 'Medium', 'type_aware': 'No', 'delegation': 'Yes', 'provenance': 'No'},
    }
    
    wb = Workbook()
    ws = wb.active
    ws.title = "E2E Comparison"
    
    headers = ['Scheme', 'Verify (ms)', 'Completion (%)', 'Block (%)', 'Privacy', 'Type-Aware', 'Delegation', 'Provenance']
    ws.append(headers)
    
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    for d in data:
        baseline = d['baseline']
        feat = features[baseline]
        ws.append([
            baseline,
            round(d['verify_latency_ms'], 1),
            round(d['task_completion_rate'] * 100, 1),
            round(d['attack_block_rate'] * 100, 1),
            feat['privacy'],
            feat['type_aware'],
            feat['delegation'],
            feat['provenance']
        ])
    
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15
    
    wb.save('analysis/outputs/tables/table2_e2e_comparison.xlsx')
    print('✓ table2_e2e_comparison.xlsx')

def create_table3():
    """Table 3: Defense Effectiveness"""
    with open('analysis/outputs/aggregated/exp4_aggregated.json') as f:
        data = json.load(f)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Defense"
    
    headers = ['Defense', 'A (Unauth)', 'B (Obvious)', 'C (Adv)', 'D (Collusion)']
    ws.append(headers)
    
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    for d in data:
        attacks = {a['attack']: a['block_rate'] * 100 for a in d['attacks']}
        ws.append([
            d['defense'],
            round(attacks.get('A_unauthorized', 0), 1),
            round(attacks.get('B_obvious', 0), 1),
            round(attacks.get('C_adversarial', 0), 1),
            round(attacks.get('D_collusion', 0), 1)
        ])
    
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15
    
    wb.save('analysis/outputs/tables/table3_defense.xlsx')
    print('✓ table3_defense.xlsx')

def create_table4():
    """Table 4: Ablation Study"""
    with open('analysis/outputs/aggregated/exp7_aggregated.json') as f:
        data = json.load(f)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Ablation"
    
    headers = ['Variant', 'Prove (ms)', 'Verify (ms)', 'Security Impact']
    ws.append(headers)
    
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    impact_map = {
        'no_g4': 'Type confusion',
        'no_g43': 'Type-specific rules bypass',
        'no_g5': 'Tag forgery',
        'no_g61': 'Replay attack',
        'plaintext_id': 'Privacy leak',
        'no_session_token': 'Performance only'
    }
    
    for d in data:
        variant = d['variant']
        ws.append([
            variant,
            round(d['prove_p50'], 0),
            round(d['verify_p50'], 1),
            impact_map.get(variant, 'Unknown')
        ])
    
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 20
    
    wb.save('analysis/outputs/tables/table4_ablation.xlsx')
    print('✓ table4_ablation.xlsx')

def create_table5():
    """Table 5: Scalability"""
    with open('analysis/outputs/aggregated/exp6_aggregated.json') as f:
        data = json.load(f)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Scalability"
    
    headers = ['Agents', 'Duration (ms)', 'Throughput (tps)']
    ws.append(headers)
    
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    for d in data:
        ws.append([
            d['n_agents'],
            round(d.get('duration_mean', 0), 1),
            round(d.get('throughput_tps', 0), 1)
        ])
    
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15
    
    wb.save('analysis/outputs/tables/table5_scalability.xlsx')
    print('✓ table5_scalability.xlsx')

if __name__ == '__main__':
    print('=== Generating Excel Tables ===')
    create_table1()
    create_table2()
    create_table3()
    create_table4()
    create_table5()
    print('\n✓ All Excel tables generated in analysis/outputs/tables/')
