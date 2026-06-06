#!/usr/bin/env python3
"""Table 3: Two-Layer Defense Effectiveness"""
import json

with open('analysis/outputs/aggregated/exp4_aggregated.json') as f:
    data = json.load(f)

print(r"""
\begin{table}[t]
\centering
\caption{Two-Layer Defense Effectiveness}
\label{tab:defense}
\begin{tabular}{lcccc}
\toprule
\textbf{Defense} & \textbf{A (Unauth)} & \textbf{B (Obvious)} & \textbf{C (Adv)} & \textbf{D (Collusion)} \\
\midrule""")

for d in data:
    defense = d['defense']
    # 修正：使用正确的字段名
    attacks = {a['attack']: a['block_rate'] * 100 for a in d['attacks']}
    
    a_rate = attacks.get('A_unauthorized', 0)
    b_rate = attacks.get('B_obvious', 0)
    c_rate = attacks.get('C_adversarial', 0)
    d_rate = attacks.get('D_collusion', 0)
    
    print(f"{defense:15s} & {a_rate:5.1f}\\% & {b_rate:5.1f}\\% & {c_rate:5.1f}\\% & {d_rate:5.1f}\\% \\\\")

print(r"""\bottomrule
\multicolumn{5}{l}{\footnotesize A: unauthorized access; B: obvious malicious content; C: adversarial prompt injection; D: collusion.} \\
\end{tabular}
\end{table}
""")
