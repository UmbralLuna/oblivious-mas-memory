// src/crypto/babyjub.ts

import { buildBabyjub } from 'circomlibjs';

export interface Point {
    x: bigint;
    y: bigint;
}

export const BABYJUB_P =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const BABYJUB_ORDER =
    2736030358979909402780800718157159386076813972158567259200215660948447373041n;
export const BABYJUB_SUBORDER =
    2736030358979909402780800718157159386076813972158567259200215660948447373041n;

export const BASE8: Point = {
    x: 5299619240641551281634865583518297030282874472190772894086521144482721001553n,
    y: 16950150798460657717958625567821834550301663161624707787222815936182638968203n,
};

let babyJubInstance: any = null;

export async function getBabyJub(): Promise<any> {
    if (!babyJubInstance) {
        babyJubInstance = await buildBabyjub();
    }
    return babyJubInstance;
}

export async function addPoint(p1: Point, p2: Point): Promise<Point> {
    const bjj = await getBabyJub();
    const F = bjj.F;
    // 必须转为域元素
    const result = bjj.addPoint([F.e(p1.x), F.e(p1.y)], [F.e(p2.x), F.e(p2.y)]);
    return {
        x: F.toObject(result[0]),
        y: F.toObject(result[1]),
    };
}

export async function mulPointEscalar(point: Point, scalar: bigint): Promise<Point> {
    const bjj = await getBabyJub();
    const F = bjj.F;
    // 必须转为域元素
    const result = bjj.mulPointEscalar([F.e(point.x), F.e(point.y)], scalar);
    return {
        x: F.toObject(result[0]),
        y: F.toObject(result[1]),
    };
}

export async function getBasePoint(): Promise<Point> {
    const bjj = await getBabyJub();
    const F = bjj.F;
    return {
        x: F.toObject(bjj.Base8[0]),
        y: F.toObject(bjj.Base8[1]),
    };
}

export async function isOnCurve(point: Point): Promise<boolean> {
    const bjj = await getBabyJub();
    const F = bjj.F;
    try {
        return bjj.inCurve([F.e(point.x), F.e(point.y)]);
    } catch {
        return false;
    }
}

export async function isInSubgroup(point: Point): Promise<boolean> {
    const bjj = await getBabyJub();
    const F = bjj.F;
    try {
        return bjj.inSubgroup([F.e(point.x), F.e(point.y)]);
    } catch {
        return false;
    }
}

export async function getPrimeOrder(): Promise<bigint> {
    return BABYJUB_SUBORDER;
}

export async function getPrime(): Promise<bigint> {
    return BABYJUB_P;
}

export async function derivePublicKey(privateKey: bigint): Promise<Point> {
    const basePoint = await getBasePoint();
    return mulPointEscalar(basePoint, privateKey);
}

export function pointEquals(p1: Point, p2: Point): boolean {
    return p1.x === p2.x && p1.y === p2.y;
}

export const ZERO_POINT: Point = { x: 0n, y: 1n };

export function isZeroPoint(point: Point): boolean {
    return point.x === 0n && point.y === 1n;
}

export function pointToString(point: Point): string {
    const xStr = point.x.toString(16).padStart(64, '0').substring(0, 8);
    const yStr = point.y.toString(16).padStart(64, '0').substring(0, 8);
    return `Point(0x${xStr}..., 0x${yStr}...)`;
}
