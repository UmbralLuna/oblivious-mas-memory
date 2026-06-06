# Artifact Documentation

## Artifact Overview

This artifact accompanies the paper "Privacy-Preserving Access Control for Multi-Agent Shared Memory via Zero-Knowledge Proofs".

### Claims Supported

| **Claim** | **Description**                           | **Verified** |
| --------- | ----------------------------------------- | ------------ |
| **C1**    | C_delegate circuit has 40,043 constraints | ✓            |
| **C2**    | Prove time P50 < 5,000ms                  | ✓            |
| **C3**    | Verify time P50 < 100ms                   | ✓            |
| **C4**    | Attack block rate > 60%                   | ✓ (70%)      |
| **C5**    | Combined defense >= 90%                   | ✓            |
| **C6**    | Correctness > 95%                         | ✓ (100%)     |

### Artifact Contents

```
oblivious-mas-memory/
├── circuits/           # ZKP circuits (Circom source + compiled)
├── src/                # Framework implementation
├── experiments/        # 8 experiment scripts
├── analysis/           # Results, aggregation, verification
├── artifacts/keys/     # Pre-generated ZKP keys
├── README.md           # Project overview
├── INSTALL.md          # Installation guide
├── EXPERIMENTS.md      # Experiment documentation
└── ARTIFACT.md         # This file
```

## Evaluation Instructions

### Minimal Evaluation (~5 minutes)

```bash
npm install
npm run build
npx ts-node experiments/exp3_e2e/run.ts
npx ts-node analysis/verification/verify_paper_claims.ts
```

Expected: 6/6 claims verified.

### Full Evaluation (~2 hours)

```bash
npm install
npm run build

# Run all experiments
npx ts-node experiments/exp1_circuit_perf/run_edge.ts && \
npx ts-node experiments/exp2_correctness/run.ts && \
npx ts-node experiments/exp3_e2e/run.ts && \
npx ts-node experiments/exp4_defense/run.ts && \
npx ts-node experiments/exp5_comparison/run.ts && \
npx ts-node experiments/exp6_scalability/run.ts && \
npx ts-node experiments/exp7_ablation/run.ts && \
npx ts-node experiments/exp8_adaptive/run.ts

# Aggregate and verify
for exp in exp1 exp3 exp4 exp5 exp6 exp7 exp8; do
    npx ts-node analysis/scripts/aggregation/aggregate_${exp}.ts
done
npx ts-node analysis/verification/verify_paper_claims.ts
python3 analysis/tables/generate_excel.py
```

## Hardware Requirements

| **Component** | **Minimum**  | **Recommended** |
| ------------- | ------------ | --------------- |
| **CPU**       | 2 cores      | 4+ cores        |
| **RAM**       | 4 GB         | 8 GB            |
| **Disk**      | 2 GB         | 5 GB            |
| **OS**        | Ubuntu 20.04 | Ubuntu 22.04    |

## Expected Output

### Paper Claims Verification

✓ C1: C_delegate has 40,043 constraints
✓ C2: Prove time P50 < 5000ms
✓ C3: Verify time P50 < 100ms
✓ C4: Attack block rate (ours) > 60%
✓ C5: Combined defense block rate >= 90%
✓ C6: Correctness tests pass rate > 95%
Verified: 6/6 (100.0%)

### Generated Tables

> **•** table1_circuit_perf.xlsx - Circuit performance benchmarks
>
> **•** table2_e2e_comparison.xlsx - Baseline comparison
>
> **•** table3_defense.xlsx - Defense effectiveness
>
> **•** table4_ablation.xlsx - Ablation study results
>
> **•** table5_scalability.xlsx - Scalability analysis
