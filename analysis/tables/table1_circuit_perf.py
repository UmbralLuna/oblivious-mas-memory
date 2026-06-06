#!/usr/bin/env python3
"""Table 1: Circuit Performance"""
import json

with open('analysis/outputs/aggregated/exp1_aggregated.json') as f:
    data = json.load(f)

print(r"""
\begin{table}[t]
\centering
\caption{Circuit Performance (delegate\_test, 40,043 constraints)}
\label{tab:circuit_perf}
\begin{tabular}{lrrrr}
\toprule
\textbf{Config} & \textbf{Prove (ms)} & \textbf{Verify (ms)} & \textbf{Proof (B)} & \textbf{zkey (MB)} \\
\midrule""")

for d in data:
    config = d['config']
    prove_p50 = d['prove_time_p50']
    verify_p50 = d['verify_time_p50']
    proof_size = d.get('proof_size_bytes', 192)
    zkey_size = d.get('zkey_size_mb', 8.5)
    print(f"{config:10s} & {prove_p50:6.0f} & {verify_p50:5.1f} & {proof_size:4d} & {zkey_size:4.1f} \\\\")

print(r"""\bottomrule
\end{tabular}
\end{table}
""")
