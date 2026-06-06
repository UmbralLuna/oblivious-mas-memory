# Oblivious Multi-Agent Memory Access Control

A zero-knowledge proof based privacy-preserving access control framework for multi-agent systems with shared memory.

## Overview

This project implements a **Memory-as-a-Service with Privacy-Preserving Access Control (MaaS-PPAC)** framework that enables multi-agent systems to securely share memory partitions while preserving agent privacy through zero-knowledge proofs.

### Key Features

- **Zero-Knowledge Delegation Proof**: Groth16-based ZKP circuit (40,043 constraints) verifying agent capabilities without revealing identity
- **Type-Aware Access Control**: Memory type safety (episodic/semantic/procedural) enforced at circuit level
- **Session Token Caching**: HMAC-based session tokens reduce repeated ZKP verification overhead
- **Write Provenance**: Pedersen commitment based write origin tracking
- **Two-Layer Defense**: ZKP proof layer + content anomaly detection layer

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ Agent (A_i) │────▶│   Prover    │────▶│  Memory Service │
│ - scope     │     │ - witness   │     │ - verify proof  │
│ - dept_id   │     │ - Groth16   │     │ - check token   │
│ - type      │     │ - proof π   │     │ - access data   │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                                     │
       │         ┌───────────────┐          │
       └────────▶│   Memory      │◀─────────┘
                 │  Partitions   │
                 │   (typed)     │
                 └───────────────┘
```

### Circuit Guarantees

| Gate      | Description                     | Constraints |
| --------- | ------------------------------- | ----------- |
| G1        | PK ownership (Pedersen hash)    | ~5,000      |
| G2        | Scope membership (Merkle proof) | ~8,000      |
| G3        | Delegation chain validation     | ~6,000      |
| G4        | Memory type safety              | ~3,428      |
| G5        | Freshness (timestamp range)     | ~1,500      |
| G6.1      | Nullifier uniqueness            | ~1,200      |
| **Total** | **C_delegate**                  | **40,043**  |

## Project Structure

```
oblivious-mas-memory/
├── circuits/               # Circom ZKP circuits
│   ├── delegate/           # Main delegation circuit
│   ├── write/              # Write provenance circuit
│   ├── ablation/           # Ablation study variants
│   └── build/              # Compiled circuit artifacts
├── src/                    # TypeScript source
│   ├── agents/             # Agent implementations
│   │   ├── benign/         # Rule-based agents
│   │   └── malicious/      # Attack agents
│   ├── baselines/          # Baseline implementations
│   │   ├── rbac/           # Role-Based Access Control
│   │   ├── abac/           # Attribute-Based Access Control
│   │   ├── aip/            # Agent Identity Protocol
│   │   ├── collaborative_memory/  # Collaborative Memory AC
│   │   └── no_ac/          # No Access Control
│   ├── crypto/             # Pedersen hash, Merkle tree
│   ├── prover/             # ZKP proof generation
│   ├── verifier/           # ZKP verification + session tokens
│   └── memory_service/     # Memory service with routes
├── experiments/            # Experiment scripts (Exp1-8)
│   ├── exp1_circuit_perf/  # Circuit performance benchmarks
│   ├── exp2_correctness/   # Correctness testing
│   ├── exp3_e2e/           # End-to-end scenario
│   ├── exp4_defense/       # Defense effectiveness
│   ├── exp5_comparison/    # Baseline comparison
│   ├── exp6_scalability/   # Scalability testing
│   ├── exp7_ablation/      # Ablation study
│   └── exp8_adaptive/      # Adaptive attack testing
├── analysis/               # Data analysis
│   ├── results/            # Raw experiment results (JSONL)
│   ├── outputs/            # Aggregated data + Excel tables
│   ├── scripts/            # Aggregation scripts
│   └── verification/       # Paper claims verification
├── artifacts/              # ZKP keys and artifacts
└── scripts/                # Build and deployment scripts
```

## Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Circom 2.x (for circuit compilation)
- snarkjs (installed via npm)
- Python 3.8+ with openpyxl (for table generation)

### Installation

```bash
# Clone repository
git clone https://github.com/your-repo/oblivious-mas-memory.git
cd oblivious-mas-memory

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Compile circuits (if not pre-built)
bash scripts/build/build_circuits.sh
```

### Run All Experiments

```bash
# Run all 8 experiments sequentially
npm run build

npx ts-node experiments/exp1_circuit_perf/run_edge.ts && \
npx ts-node experiments/exp2_correctness/run.ts && \
npx ts-node experiments/exp3_e2e/run.ts && \
npx ts-node experiments/exp4_defense/run.ts && \
npx ts-node experiments/exp5_comparison/run.ts && \
npx ts-node experiments/exp6_scalability/run.ts && \
npx ts-node experiments/exp7_ablation/run.ts && \
npx ts-node experiments/exp8_adaptive/run.ts

# Aggregate results
for exp in exp1 exp3 exp4 exp5 exp6 exp7 exp8; do
    npx ts-node analysis/scripts/aggregation/aggregate_${exp}.ts
done

# Verify paper claims
npx ts-node analysis/verification/verify_paper_claims.ts

# Generate Excel tables
python3 analysis/tables/generate_excel.py
```

### Run Individual Experiments

```bash
# Exp1: Circuit performance (700 iterations, ~50min)
npx ts-node experiments/exp1_circuit_perf/run_edge.ts

# Exp3: End-to-end scenario (~3min)
npx ts-node experiments/exp3_e2e/run.ts

# Exp4: Defense effectiveness (~2min)
npx ts-node experiments/exp4_defense/run.ts
```

## Experiment Results

### Performance (Exp1)

| **Config**    | **Prove (ms)** | **Verify (ms)** | **Constraints** |
| ------------- | -------------- | --------------- | --------------- |
| **N=4, d=4**  | 2,889          | 19.4            | 17,600          |
| **N=8, d=6**  | 2,916          | 20.1            | 24,600          |
| **N=16, d=6** | 2,916          | 20.8            | 37,400          |
| **N=32, d=4** | 2,922          | 21.0            | 62,400          |

### Comparison (Exp5)

| **Scheme**       | **Block Rate** | **Verify (ms)** | **Privacy** | **Type-Aware** |
| ---------------- | -------------- | --------------- | ----------- | -------------- |
| **Ours**         | **70.0%**      | 12              | High (ZKP)  | Yes            |
| **AIP**          | 64.8%          | 8               | Medium      | No             |
| **ABAC**         | 54.4%          | 2               | Low         | Partial        |
| **RBAC**         | 54.0%          | 1               | Low         | No             |
| **CollabMemory** | 24.0%          | 5               | Medium      | No             |
| **NoAC**         | 0.0%           | 0               | None        | No             |

### Defense (Exp4)

| **Defense**      | **Unauthorized** | **Obvious** | **Adversarial** | **Collusion** |
| ---------------- | ---------------- | ----------- | --------------- | ------------- |
| **MWPP only**    | 100%             | 0%          | 0%              | 0%            |
| **Content only** | 0%               | 100%        | 60%             | 100%          |
| **Combined**     | **100%**         | **100%**    | **60%**         | **100%**      |

### Paper Claims Verification

✓ C1: C_delegate has 40,043 constraints
✓ C2: Prove time P50 < 5,000ms
✓ C3: Verify time P50 < 100ms
✓ C4: Attack block rate (ours) > 60%
✓ C5: Combined defense block rate >= 90%
✓ C6: Correctness tests pass rate > 95%
Verified: 6/6 (100.0%)

## Citation

```bibtex
@article{oblivious-mas-memory-2025,
  title={Privacy-Preserving Access Control for Multi-Agent Shared Memory via Zero-Knowledge Proofs},
  year={2025}
}
```

## License

MIT License
