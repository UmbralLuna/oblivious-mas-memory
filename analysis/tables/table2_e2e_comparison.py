#!/usr/bin/env python3
"""Table 2: End-to-End Comparison"""
import json

with open('analysis/outputs/aggregated/exp5_aggregated.json') as f:
    data = json.load(f)

# 手动添加特性列（根据论文设计）
features = {
    'ours': {'privacy': 'High', 'type_aware': 'Yes', 'delegation': 'Yes', 'provenance': 'Yes'},
    'no_ac': {'privacy': 'None', 'type_aware': 'No', 'delegation': 'No', 'provenance': 'No'},
    'rbac': {'privacy': 'Low', 'type_aware': 'No', 'delegation': 'No', 'provenance': 'No'},
    'abac': {'privacy': 'Low', 'type_aware': 'Partial', 'delegation': 'No', 'provenance': 'No'},
    'collab_memory': {'privacy': 'Medium', 'type_aware': 'No', 'delegation': 'Partial', 'provenance': 'No'},
    'aip': {'privacy': 'Medium', 'type_aware': 'No', 'delegation': 'Yes', 'provenance': 'No'},
}

print(r"""
\begin{table*}[t]
\centering
\caption{End-to-End Comparison: Security, Privacy, and Functionality}
\label{tab:e2e_comparison}
\begin{tabular}{lrrrcccc}
\toprule
\textbf{Scheme} & \textbf{Verify (ms)} & \textbf{Completion (\%)} & \textbf{Block (\%)} & \textbf{Privacy} & \textbf{Type-Aware} & \textbf{Delegation} & \textbf{Provenance} \\
\midrule""")

for d in data:
    baseline = d['baseline']
    verify = d['verify_latency_ms']
    completion = d['task_completion_rate'] * 100
    block = d['attack_block_rate'] * 100
    feat = features[baseline]
    
    print(f"{baseline:15s} & {verify:4.0f} & {completion:5.1f} & {block:5.1f} & "
          f"{feat['privacy']:6s} & {feat['type_aware']:7s} & {feat['delegation']:10s} & {feat['provenance']:10s} \\\\")

print(r"""\bottomrule
\multicolumn{8}{l}{\footnotesize Privacy: information leakage level; Type-Aware: memory type distinction (episodic/semantic/procedural);} \\
\multicolumn{8}{l}{\footnotesize Delegation: capability delegation support; Provenance: cryptographic write origin tracking.} \\
\end{tabular}
\end{table*}
""")
