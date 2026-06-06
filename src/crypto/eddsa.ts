// src/crypto/eddsa.ts

import { buildEddsa } from 'circomlibjs';
import { randomBytes } from 'crypto';
import type { Point } from './babyjub';

let eddsaInstance: any = null;

export async function getEddsa(): Promise<any> {
    if (!eddsaInstance) {
        eddsaInstance = await buildEddsa();
    }
    return eddsaInstance;
}

export interface EdDSAKeyPair {
    privateKey: Buffer;
    publicKey: [bigint, bigint];
}

export interface EdDSASignature {
    R8x: bigint;
    R8y: bigint;
    S: bigint;
}

/**
 * 生成密钥对
 * 私钥必须是 32 字节 Buffer
 */
export async function generateKeyPair(seed?: Buffer | string): Promise<EdDSAKeyPair> {
    const ed = await getEddsa();
    const F = ed.babyJub.F;

    let privateKey: Buffer;
    if (seed === undefined) {
        privateKey = randomBytes(32);
    } else if (typeof seed === 'string') {
        // 用 SHA-256 从任意字符串生成 32 字节
        const { createHash } = require('crypto');
        const hash = createHash('sha256').update(seed).digest();
        privateKey = hash;
    } else {
        privateKey = seed;
    }

    // 确保 32 字节
    if (privateKey.length < 32) {
        const padded = Buffer.alloc(32);
        privateKey.copy(padded);
        privateKey = padded;
    } else if (privateKey.length > 32) {
        privateKey = privateKey.subarray(0, 32);
    }

    const publicKeyPoint = ed.prv2pub(privateKey);

    return {
        privateKey,
        publicKey: [F.toObject(publicKeyPoint[0]), F.toObject(publicKeyPoint[1])],
    };
}

/**
 * 签名消息
 * message 必须是 bigint（Poseidon 哈希结果）
 */
export async function sign(privateKey: Buffer, message: bigint): Promise<EdDSASignature> {
    const ed = await getEddsa();
    const F = ed.babyJub.F;

    // 确保 32 字节
    if (privateKey.length !== 32) {
        throw new Error(`Private key must be 32 bytes, got ${privateKey.length}`);
    }

    // signPoseidon 需要域元素
    const msgField = F.e(message);
    const sig = ed.signPoseidon(privateKey, msgField);

    return {
        R8x: F.toObject(sig.R8[0]),
        R8y: F.toObject(sig.R8[1]),
        S: sig.S,
    };
}

/**
 * 验证签名
 */
export async function verify(
    publicKey: [bigint, bigint],
    message: bigint,
    signature: EdDSASignature
): Promise<boolean> {
    const ed = await getEddsa();
    const F = ed.babyJub.F;

    try {
        const msgField = F.e(message);
        const pubKey = [F.e(publicKey[0]), F.e(publicKey[1])];
        const sig = {
            R8: [F.e(signature.R8x), F.e(signature.R8y)],
            S: signature.S,
        };

        return ed.verifyPoseidon(msgField, sig, pubKey);
    } catch {
        return false;
    }
}

export function publicKeyToPoint(publicKey: [bigint, bigint]): Point {
    return { x: publicKey[0], y: publicKey[1] };
}

export function pointToPublicKey(point: Point): [bigint, bigint] {
    return [point.x, point.y];
}

export const EDDSA_SIGNATURE_BYTES = 96;
export const EDDSA_PUBLIC_KEY_BYTES = 64;
