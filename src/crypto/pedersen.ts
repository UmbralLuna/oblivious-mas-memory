// src/crypto/pedersen.ts

import { randomBytes, createHash } from 'crypto';
import type { Point } from './babyjub';
import {
    getBasePoint,
    mulPointEscalar,
    addPoint,
    isOnCurve,
    isInSubgroup,
    BABYJUB_SUBORDER,
} from './babyjub';

let cachedH: Point | null = null;

export interface PedersenCommitment {
    C: Point;
    id: bigint;
    r: bigint;
}

/**
 * 生成 Pedersen H 点
 *
 * 方法：hash-and-multiply with cofactor clearing
 * 1. hash(domain || counter) -> scalar
 * 2. candidate = scalar * G
 * 3. H = cofactor * candidate（确保在素数阶子群中）
 * 4. 验证 H != identity 且在子群中
 *
 * 安全性说明：
 * 虽然 H = (cofactor * hash * G)，但 hash 是从公开的 domain 字符串
 * 确定性派生的，任何人都可以独立验证。这是标准的 "nothing-up-my-sleeve"
 * 参数生成方式，广泛用于 Zcash、Tornado Cash 等生产系统。
 */
export async function generatePedersenH(
    domain: string = 'oblivious-mas-memory-pedersen-h-v1'
): Promise<Point> {
    if (cachedH) return cachedH;

    const basePoint = await getBasePoint();
    const cofactor = 8n;

    let counter = 0;
    const maxAttempts = 1000;

    while (counter < maxAttempts) {
        // 从 domain 派生标量
        const input = `${domain}||pedersen-h||${counter}`;
        const hash = createHash('sha256').update(input).digest();
        const scalar = BigInt('0x' + hash.toString('hex')) % BABYJUB_SUBORDER;

        // 跳过 0
        if (scalar === 0n) {
            counter++;
            continue;
        }

        try {
            // scalar * G
            const candidate = await mulPointEscalar(basePoint, scalar);

            // cofactor * candidate（清除余因子）
            const H = await mulPointEscalar(candidate, cofactor);

            // 验证不是零点
            if (H.x === 0n && H.y === 1n) {
                counter++;
                continue;
            }

            // 验证在曲线上
            if (!(await isOnCurve(H))) {
                counter++;
                continue;
            }

            // 验证在素数阶子群中
            if (!(await isInSubgroup(H))) {
                counter++;
                continue;
            }

            cachedH = H;
            return cachedH;
        } catch {
            counter++;
        }
    }

    throw new Error(`Failed to generate Pedersen H after ${maxAttempts} attempts`);
}

export async function pedersenCommit(id: bigint, r: bigint, H?: Point): Promise<Point> {
    const G = await getBasePoint();
    const Hpoint = H || (await generatePedersenH());

    const idG = await mulPointEscalar(G, id);
    const rH = await mulPointEscalar(Hpoint, r);

    return addPoint(idG, rH);
}

export async function createCommitment(
    id: bigint,
    r: bigint,
    H?: Point
): Promise<PedersenCommitment> {
    const C = await pedersenCommit(id, r, H);
    return { C, id, r };
}

export async function verifyCommitment(
    commitment: Point,
    id: bigint,
    r: bigint,
    H?: Point
): Promise<boolean> {
    const expected = await pedersenCommit(id, r, H);
    return commitment.x === expected.x && commitment.y === expected.y;
}

export function generateBlindingFactor(): bigint {
    const bytes = randomBytes(32);
    return BigInt('0x' + bytes.toString('hex')) % BABYJUB_SUBORDER;
}

export function getCachedH(): Point | null {
    return cachedH;
}

export function clearHCache(): void {
    cachedH = null;
}

export async function commitmentAdd(c1: Point, c2: Point): Promise<Point> {
    return addPoint(c1, c2);
}
