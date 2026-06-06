// src/verifier/verify.ts
// Groth16 证明验证
// 规范 v4.0 §5.2

import { groth16 } from 'snarkjs';
import { promises as fs } from 'fs';
import { HighResTimer } from '../utils/timer';
import type { VerifyResult } from '../prover/types';

/**
 * 验证委托证明
 */
export async function verifyDelegateProof(
    proof: any,
    publicSignals: string[],
    vkeyPath: string
): Promise<VerifyResult> {
    const vKey = JSON.parse(await fs.readFile(vkeyPath, 'utf-8'));

    const timer = new HighResTimer();
    timer.start();

    const valid = await groth16.verify(vKey, publicSignals, proof);

    const verify_ns = timer.stop();

    return {
        valid,
        verify_ms: Number(verify_ns) / 1e6,
    };
}

/**
 * 验证写入证明
 */
export async function verifyWriteProof(
    proof: any,
    publicSignals: string[],
    vkeyPath: string
): Promise<VerifyResult> {
    const vKey = JSON.parse(await fs.readFile(vkeyPath, 'utf-8'));

    const timer = new HighResTimer();
    timer.start();

    const valid = await groth16.verify(vKey, publicSignals, proof);

    const verify_ns = timer.stop();

    return {
        valid,
        verify_ms: Number(verify_ns) / 1e6,
    };
}
