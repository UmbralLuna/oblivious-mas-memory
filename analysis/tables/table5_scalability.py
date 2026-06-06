#!/usr/bin/env python3
"""Table 5: Scalability"""
import json

with open('analysis/outputs/aggregated/exp6_aggregated.json') as f:
    data = json.load(f)

print(r"""
\begin{table}[t]
\centering
\caption{Scalability: Throughput vs. Number of Agents}
\label{tab:scalability}
\begin{tabular}{rrr}
\toprule
\textbf{Agents} & \textbf{Duration (ms)} & \textbf{Throughput (tps)} \\
\midrule""")

for d in data:
    n = d['n_agents']
    # 修正：使用正确的字段名
    duration = d.get('duration_ms', d.get('duration_p50', 0))
    throughput = d.get('throughput', d.get('throughput_p50', 0))
    
    print(f"{n:4d} & {duration:8.1f} & {throughput:8.1f} \\\\")

print(r"""\bottomrule
\end{tabular}
\end{table}
""")
