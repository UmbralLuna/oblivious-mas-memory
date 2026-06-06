// src/prover/prove.ts
// Groth16 证明生成
// 规范 v4.0 §5.1

import { groth16 } from 'snarkjs';
import { HighResTimer } from '../utils/timer';
import type { ProofResult, DelegateWitnessInput, WriteWitnessInput } from './types';

/**
 * 生成委托证明
 */
export async function generateDelegateProof(
    input: DelegateWitnessInput,
    wasmPath: string,
    zkeyPath: string
): Promise<ProofResult> {
    const timer = new HighResTimer();
    timer.start();

    const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

    const total_ns = timer.stop();

    return {
        proof,
        publicSignals,
        timing: {
            total_ms: Number(total_ns) / 1e6,
        },
    };
}

/**
 * 生成写入证明
 */
export async function generateWriteProof(
    input: WriteWitnessInput,
    wasmPath: string,
    zkeyPath: string
): Promise<ProofResult> {
    const timer = new HighResTimer();
    timer.start();

    const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

    const total_ns = timer.stop();

    return {
        proof,
        publicSignals,
        timing: {
            total_ms: Number(total_ns) / 1e6,
        },
    };
}
