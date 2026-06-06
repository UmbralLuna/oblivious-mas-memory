// src/crypto/poseidon_utils.ts
import { buildPoseidon } from 'circomlibjs';

export class Poseidon {
    private static poseidon: any;
    private static initialized = false;

    static async initialize(): Promise<void> {
        if (this.initialized) return;
        this.poseidon = await buildPoseidon();
        this.initialized = true;
    }

    static async hash(input: bigint): Promise<bigint> {
        await this.initialize();
        const result = this.poseidon([input]);
        return this.poseidon.F.toObject(result);
    }

    static async hashN(inputs: bigint[]): Promise<bigint> {
        await this.initialize();
        const result = this.poseidon(inputs);
        return this.poseidon.F.toObject(result);
    }

    static async hashCapability(cap: {
        iss: bigint;
        hld: bigint;
        scope_root: bigint;
        perm: bigint;
        depth: bigint;
        exp: bigint;
        attr_hash: bigint;
        tc_hash: bigint;
    }): Promise<bigint> {
        return this.hashN([
            cap.iss, cap.hld, cap.scope_root, cap.perm,
            cap.depth, cap.exp, cap.attr_hash, cap.tc_hash,
        ]);
    }

    static async hashTC(tc: [bigint, bigint, bigint]): Promise<bigint> {
        return this.hashN([tc[0], tc[1], tc[2]]);
    }

    static async hashPartitionLeaf(
        M: bigint, tau: bigint, tags: bigint, s: bigint
    ): Promise<bigint> {
        return this.hashN([M, tau, tags, s]);
    }

    static async nullifier(domain: bigint, sk: bigint, h_c: bigint): Promise<bigint> {
        return this.hashN([domain, sk, h_c]);
    }
}
