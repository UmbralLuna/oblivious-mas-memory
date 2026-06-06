#!/usr/bin/env python3
"""Table 4: Ablation Study"""
import json

with open('analysis/outputs/aggregated/exp7_aggregated.json') as f:
    data = json.load(f)

# 变体说明
descriptions = {
    'no_g4': 'Remove G4 (memory type safety)',
    'no_g43': 'Remove G4.3 (type-specific rules)',
    'no_g5': 'Remove G5 (tag consistency)',
    'no_g61': 'Remove G6.1 (nullifier)',
    'plaintext_id': 'Plaintext writer ID',
    'no_session_token': 'No session token caching',
}

print(r"""
\begin{table}[t]
\centering
\caption{Ablation Study: Impact of Each Component}
\label{tab:ablation}
\begin{tabular}{lrrl}
\toprule
\textbf{Variant} & \textbf{Prove (ms)} & \textbf{Verify (ms)} & \textbf{Security Impact} \\
\midrule""")

for d in data:
    variant = d['variant']
    prove = d['prove_p50']
    verify = d['verify_p50']
    desc = descriptions.get(variant, 'Unknown')
    
    # 安全影响（简化描述）
    if 'g4' in variant:
        impact = 'Type confusion'
    elif 'g5' in variant:
        impact = 'Tag forgery'
    elif 'g61' in variant:
        impact = 'Replay attack'
    elif 'plaintext' in variant:
        impact = 'Privacy leak'
    elif 'session' in variant:
        impact = 'Performance only'
    else:
        impact = 'Unknown'
    
    print(f"{variant:18s} & {prove:6.0f} & {verify:5.1f} & {impact:20s} \\\\")

print(r"""\bottomrule
\end{tabular}
\end{table}
""")
