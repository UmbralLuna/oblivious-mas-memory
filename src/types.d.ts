// src/types.d.ts

declare module 'circomlibjs' {
    export interface BabyJub {
        F: any;
        Base8: [any, any];
        order: bigint;
        subOrder: bigint;
        addPoint(p1: [any, any], p2: [any, any]): [any, any];
        mulPointEscalar(p: [any, any], scalar: bigint | any): [any, any];
        inCurve(p: [any, any]): boolean;
        inSubgroup(p: [any, any]): boolean;
        packPoint(p: [any, any]): Uint8Array;
        unpackPoint(packed: Uint8Array): [any, any] | null;
        p: bigint;
    }

    export interface Poseidon {
        (inputs: any[]): any;
        F: any;
    }

    export interface Eddsa {
        F: any;
        prv2pub(privateKey: Buffer): [any, any];
        signPoseidon(
            privateKey: Buffer,
            message: any
        ): {
            R8: [any, any];
            S: bigint;
        };
        verifyPoseidon(
            message: any,
            signature: { R8: [any, any]; S: bigint },
            publicKey: [any, any]
        ): boolean;
    }

    export function buildBabyjub(): Promise<BabyJub>;
    export function buildPoseidon(): Promise<Poseidon>;
    export function buildEddsa(): Promise<Eddsa>;
    export function buildMimc7(): Promise<any>;
    export function buildMimcSponge(): Promise<any>;
    export function buildPedersenHash(): Promise<any>;
    export function buildSMT(): Promise<any>;
}

declare module 'circom_tester' {
    export function wasm(
        circuitPath: string,
        options?: {
            output?: string;
            recompile?: boolean;
            include?: string[];
            prime?: string;
        }
    ): Promise<{
        calculateWitness(input: Record<string, any>, sanityCheck?: boolean): Promise<bigint[]>;
        checkConstraints(witness: bigint[]): Promise<void>;
        loadSymbols(): Promise<void>;
        symbols: Record<string, any>;
    }>;

    export function c(circuitPath: string, options?: any): Promise<any>;
}

declare module 'chai-as-promised';

declare module 'snarkjs' {
    export namespace groth16 {
        export function fullProve(
            input: any,
            wasmPath: string,
            zkeyPath: string
        ): Promise<{ proof: any; publicSignals: string[] }>;

        export function verify(vKey: any, publicSignals: string[], proof: any): Promise<boolean>;

        export function prove(
            zkeyPath: string,
            witnessPath: string
        ): Promise<{ proof: any; publicSignals: string[] }>;
    }

    export namespace zKey {
        export function exportVerificationKey(zkeyPath: string): Promise<any>;
        export function newZKey(r1csPath: string, ptauPath: string, zkeyPath: string): Promise<any>;
        export function contribute(
            oldZkeyPath: string,
            newZkeyPath: string,
            name: string,
            entropy: string
        ): Promise<any>;
    }

    export namespace powersOfTau {
        export function newAccumulator(
            curve: string,
            power: number,
            outPath: string
        ): Promise<void>;
        export function contribute(
            oldPath: string,
            newPath: string,
            name: string,
            entropy: string
        ): Promise<any>;
        export function verify(ptauPath: string): Promise<boolean>;
        export function preparePhase2(ptauPath: string, outPath: string): Promise<void>;
    }

    export namespace wtns {
        export function calculate(input: any, wasmPath: string, witnessPath: string): Promise<void>;
        export function exportJson(witnessPath: string): Promise<bigint[]>;
    }
}
