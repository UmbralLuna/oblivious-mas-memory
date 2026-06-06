# Experiment Documentation

## Overview

8 experiments validate the framework across performance, correctness, security, and scalability.

| **Exp**  | **Name**            | **Records** | **Duration** | **Purpose**                     |
| -------- | ------------------- | ----------- | ------------ | ------------------------------- |
| **Exp1** | Circuit Performance | 700         | ~50min       | Prove/verify time benchmarks    |
| **Exp2** | Correctness         | 1,200       | ~30min       | Functional correctness testing  |
| **Exp3** | End-to-End          | 4,500       | ~3min        | Full scenario with 6 baselines  |
| **Exp4** | Defense             | 1,050       | ~2min        | Two-layer defense effectiveness |
| **Exp5** | Comparison          | 6           | ~5sec        | Aggregate baseline comparison   |
| **Exp6** | Scalability         | 13          | ~5min        | Agent count scaling             |
| **Exp7** | Ablation            | 1,327       | ~30min       | Component contribution analysis |
| **Exp8** | Adaptive            | 180         | ~10min       | Advanced attack resistance      |

## Experiment Details

### Exp1: Circuit Performance

**Purpose**: Benchmark ZKP prove/verify times across different configurations.

**Configurations**: 7 (N_a ∈ {4,8,16,32}, d_s ∈ {4,6})

**Metrics**: prove_time_ms, verify_time_ms, proof_size_bytes

**Output**: analysis/results/exp1_circuit_perf/prod/

### Exp2: Correctness Testing

**Purpose**: Verify circuit produces correct accept/reject decisions.

**Tests**:

> **•** 100 valid fixtures (should accept)
>
> **•** 100 invalid fixtures (should reject)
>
> **•** 1,000 differential tests (consistency)

**Output**: analysis/results/exp2_correctness/

### Exp3: End-to-End Scenario

**Purpose**: Enterprise scenario with 5 departments, 6 baselines.

**Setup**:

> **•** 5 departments: R&D, Finance, Legal, Marketing, Ops
>
> **•** 500 normal tasks + 150 attack tasks
>
> **•** 6 baselines: ours, no_ac, rbac, abac, collab_memory, aip

**Baselines**:

| **Baseline**      | **Logic**                                             |
| ----------------- | ----------------------------------------------------- |
| **ours**          | Episodic cross-dept isolation + ZKP privacy           |
| **no_ac**         | Allow all access                                      |
| **rbac**          | Dept partitions + shared + cross-dept project_records |
| **abac**          | Sensitivity threshold (< 0.6 allowed)                 |
| **collab_memory** | Only block finance_records, legal_docs                |
| **aip**           | Department collaboration graph                        |

**Output**: analysis/results/exp3_e2e/

### Exp4: Defense Effectiveness

**Purpose**: Test two-layer defense against 4 attack types.

**Attack Types**:

> **•** A: Unauthorized agent (invalid credentials)
>
> **•** B: Obvious injection (detectable patterns)
>
> **•** C: Adversarial (crafted to evade detection)
>
> **•** D: Collusion (multiple compromised agents)

**Defense Layers**:

> **•** MWPP only: ZKP proof verification
>
> **•** Content only: Content anomaly detection
>
> **•** Combined: Both layers

**Output**: analysis/results/exp4_defense/

### Exp5: Baseline Comparison

**Purpose**: Aggregate Exp3 data for comparison table.

**Output**: analysis/results/exp5_comparison/

### Exp6: Scalability

**Purpose**: Test throughput with increasing agent count.

**Configurations**: 10, 50, 100 agents

**Output**: analysis/results/exp6_scalability/

### Exp7: Ablation Study

**Purpose**: Measure contribution of each circuit component.

**Variants**:

| **Variant**          | **Removed**         | **Security Impact**    |
| -------------------- | ------------------- | ---------------------- |
| **no_g4**            | Type safety         | Type confusion attacks |
| **no_g43**           | Type-specific rules | Rule bypass            |
| **no_g5**            | Freshness check     | Tag forgery            |
| **no_g61**           | Nullifier           | Replay attacks         |
| **plaintext_id**     | ID hashing          | Privacy leak           |
| **no_session_token** | Session cache       | Performance only       |

**Output**: analysis/results/exp7_ablation/

### Exp8: Adaptive Attacks

**Purpose**: Test against sophisticated attacks.

**Attack Types**:

> **•** White-box circuit analysis
>
> **•** Scope fuzzing
>
> **•** RL-based collusion

**Output**: analysis/results/exp8_adaptive/

## Data Format

All experiments output JSONL (JSON Lines) format:

```json
{
  "schema_version": "1.0.0",
  "exp_id": "exp3",
  "baseline": "ours",
  "machine": { "cpu": "...", "ram_gb": 8 },
  "metrics": {
    "success": 1,
    "duration_ms": 12
  },
  "status": "ok"
}
```

## Reproducing Results

```bash
# Full reproduction (~2 hours)
npm run build

npx ts-node experiments/exp1_circuit_perf/run_edge.ts && \
npx ts-node experiments/exp2_correctness/run.ts && \
npx ts-node experiments/exp3_e2e/run.ts && \
npx ts-node experiments/exp4_defense/run.ts && \
npx ts-node experiments/exp5_comparison/run.ts && \
npx ts-node experiments/exp6_scalability/run.ts && \
npx ts-node experiments/exp7_ablation/run.ts && \
npx ts-node experiments/exp8_adaptive/run.ts

# Aggregate + verify
for exp in exp1 exp3 exp4 exp5 exp6 exp7 exp8; do
    npx ts-node analysis/scripts/aggregation/aggregate_${exp}.ts
done
npx ts-node analysis/verification/verify_paper_claims.ts
python3 analysis/tables/generate_excel.py
```
