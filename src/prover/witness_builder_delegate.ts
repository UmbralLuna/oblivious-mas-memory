// src/prover/witness_builder_delegate.ts
import { EdDSAUtils } from '../crypto/eddsa_utils';
import type { EdDSAKeyPair, EdDSASignature } from '../crypto/eddsa_utils';
import { Poseidon } from '../crypto/poseidon_utils';
import { MerkleTree } from '../crypto/merkle_utils';
import type { MerkleProof } from '../crypto/merkle_utils';

export interface Capability {
    iss: bigint;
    hld: bigint;
    scope_root: bigint;
    perm: bigint;
    depth: bigint;
    exp: bigint;
    attr_hash: bigint;
    tc_hash: bigint;
    tc: [bigint, bigint, bigint];
}

export interface Partition {
    M: bigint;
    tau: bigint;
    tags: bigint;
    s: bigint;
    is_active: bigint;
}

export interface DelegateWitness {
    h_c: string;
    pk_issuer: [string, string];
    nullifier: string;
    current_time: string;
    parent_iss: string;
    parent_hld: string;
    parent_scope_root: string;
    parent_perm: string;
    parent_depth: string;
    parent_exp: string;
    parent_attr_hash: string;
    parent_tc_hash: string;
    parent_tc: [string, string, string];
    child_iss: string;
    child_hld: string;
    child_scope_root: string;
    child_perm: string;
    child_depth: string;
    child_exp: string;
    child_attr_hash: string;
    child_tc_hash: string;
    child_tc: [string, string, string];
    randomness: string;
    sig_R8x: string;
    sig_R8y: string;
    sig_S: string;
    holder_sk: string;
    holder_pk_x: string;
    holder_pk_y: string;
    partition_M: string[];
    partition_tau: string[];
    partition_tags: string[];
    partition_s: string[];
    partition_is_active: string[];
    merkle_paths: string[][];
    merkle_indices: string[][];
    k_amplification: string;
    depth_parent_partition: string[];
    depth_child_partition: string[];
}

export class WitnessBuilderDelegate {
    private N_a: number;
    private d_s: number;
    private merkleDepth: number;

    constructor(N_a: number, d_s: number) {
        this.N_a = N_a;
        this.d_s = d_s;
        this.merkleDepth = Math.log2(N_a);
    }

    async buildValidDelegation(seed: number): Promise<DelegateWitness> {
        const issuerSeed = EdDSAUtils.seedToPrivateKey(seed);
        const issuerKeyPair = await EdDSAUtils.generateKeyPair(issuerSeed);
        const holderSeed = EdDSAUtils.seedToPrivateKey(seed + 1);
        const holderKeyPair = await EdDSAUtils.generateKeyPair(holderSeed);
        const partitions = await this.buildPartitions(seed);
        // 构建 Merkle 树（匹配电路的 MerkleTreeBuilderWithMask）
        const merkleTree = new MerkleTree(this.merkleDepth);
        for (const partition of partitions) {
            const leafHash = await Poseidon.hashPartitionLeaf(partition.M, partition.tau, partition.tags, partition.s);
            // ✅ 匹配电路：masked = is_active ? leaf : 0
            const maskedLeaf = partition.is_active === 1n ? leafHash : 0n;
            merkleTree.addLeaf(maskedLeaf);
        }
        const childScopeRoot = await merkleTree.getRoot();

        // 构建父 scope 树（d_s 深度，包含所有分区叶子）
        const parentMerkleTree = new MerkleTree(this.d_s);
        for (const partition of partitions) {
            const leafHash = await Poseidon.hashPartitionLeaf(partition.M, partition.tau, partition.tags, partition.s);
            parentMerkleTree.addLeaf(leafHash);
        }
        const parentScopeRoot = await parentMerkleTree.getRoot();

        const parentCap = await this.buildParentCapability(issuerKeyPair.publicKey, holderKeyPair.publicKey, seed, parentScopeRoot);
        const childCap = await this.buildChildCapability(parentCap, childScopeRoot, seed);
        const parentCapHash = await Poseidon.hashCapability(parentCap);
        const signature = await EdDSAUtils.sign(issuerKeyPair.privateKey, parentCapHash);
        // G3 用父 scope 树的 Merkle 证明
        const merkleProofs: MerkleProof[] = [];
        for (let i = 0; i < this.N_a; i++) {
            const proof = await parentMerkleTree.getProof(i);
            merkleProofs.push(proof);
        }
        const randomness = BigInt(seed + 100);
        const h_c = await this.computeH_c(childCap, randomness);
        const nullifier = await Poseidon.nullifier(0n, BigInt(holderKeyPair.privateKey[0]), h_c);
        const current_time = BigInt(Math.floor(Date.now() / 1000));
        return this.assembleWitness(issuerKeyPair, holderKeyPair, parentCap, childCap, signature, partitions, merkleProofs, h_c, nullifier, current_time, randomness);
    }

    async buildInvalidDelegation(seed: number, violationType: 'expired' | 'wrong_perm' | 'wrong_depth' | 'wrong_tc'): Promise<DelegateWitness> {
        const validWitness = await this.buildValidDelegation(seed);
        switch (violationType) {
            case 'expired': validWitness.child_exp = '1600000000'; break;
            case 'wrong_perm': validWitness.child_perm = '31'; break;
            case 'wrong_depth': validWitness.child_depth = validWitness.parent_depth; break;
            case 'wrong_tc': validWitness.child_tc = ['2', '2', '2']; break;
        }
        return validWitness;
    }

    private async buildParentCapability(issuerPubKey: [bigint, bigint], holderPubKey: [bigint, bigint], seed: number, scopeRoot: bigint): Promise<Capability> {
        const tc: [bigint, bigint, bigint] = [2n, 2n, 2n];
        const tc_hash = await Poseidon.hashTC(tc);
        const iss = await Poseidon.hashN([issuerPubKey[0], issuerPubKey[1]]);
        const hld = await Poseidon.hashN([holderPubKey[0], holderPubKey[1]]);
        return { iss, hld, scope_root: scopeRoot, perm: 15n, depth: 5n, exp: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600), attr_hash: BigInt(seed + 20), tc_hash, tc };
    }

    private async buildChildCapability(parentCap: Capability, childScopeRoot: bigint, seed: number): Promise<Capability> {
        const tc: [bigint, bigint, bigint] = [1n, 1n, 1n];
        const tc_hash = await Poseidon.hashTC(tc);
        return { iss: parentCap.iss, hld: parentCap.hld, scope_root: childScopeRoot, perm: 7n, depth: 3n, exp: parentCap.exp, attr_hash: BigInt(seed + 30), tc_hash, tc };
    }

    private async buildPartitions(seed: number): Promise<Partition[]> {
        const partitions: Partition[] = [];
        for (let i = 0; i < this.N_a; i++) {
            partitions.push({ M: BigInt(seed + 100 + i), tau: BigInt(i % 3), tags: BigInt(16 + (i % 16)), s: BigInt(240), is_active: i < this.N_a / 2 ? 1n : 0n });
        }
        return partitions;
    }

    private async computeH_c(cap: Capability, randomness: bigint): Promise<bigint> {
        return Poseidon.hashN([cap.iss, cap.hld, cap.scope_root, cap.perm, cap.depth, cap.exp, cap.attr_hash, cap.tc_hash, randomness]);
    }

    private async assembleWitness(issuerKeyPair: EdDSAKeyPair, holderKeyPair: EdDSAKeyPair, parentCap: Capability, childCap: Capability, signature: EdDSASignature, partitions: Partition[], merkleProofs: MerkleProof[], h_c: bigint, nullifier: bigint, current_time: bigint, randomness: bigint): Promise<DelegateWitness> {
        while (partitions.length < this.N_a) partitions.push({ M: 0n, tau: 0n, tags: 0n, s: 0n, is_active: 0n });
        while (merkleProofs.length < this.N_a) merkleProofs.push({ leaf: 0n, pathElements: Array(this.d_s).fill(0n), pathIndices: Array(this.d_s).fill(0), root: 0n });
        return {
            h_c: h_c.toString(),
            pk_issuer: [issuerKeyPair.publicKey[0].toString(), issuerKeyPair.publicKey[1].toString()],
            nullifier: nullifier.toString(),
            current_time: current_time.toString(),
            parent_iss: parentCap.iss.toString(),
            parent_hld: parentCap.hld.toString(),
            parent_scope_root: parentCap.scope_root.toString(),
            parent_perm: parentCap.perm.toString(),
            parent_depth: parentCap.depth.toString(),
            parent_exp: parentCap.exp.toString(),
            parent_attr_hash: parentCap.attr_hash.toString(),
            parent_tc_hash: parentCap.tc_hash.toString(),
            parent_tc: [parentCap.tc[0].toString(), parentCap.tc[1].toString(), parentCap.tc[2].toString()],
            child_iss: childCap.iss.toString(),
            child_hld: childCap.hld.toString(),
            child_scope_root: childCap.scope_root.toString(),
            child_perm: childCap.perm.toString(),
            child_depth: childCap.depth.toString(),
            child_exp: childCap.exp.toString(),
            child_attr_hash: childCap.attr_hash.toString(),
            child_tc_hash: childCap.tc_hash.toString(),
            child_tc: [childCap.tc[0].toString(), childCap.tc[1].toString(), childCap.tc[2].toString()],
            randomness: randomness.toString(),
            sig_R8x: signature.R8[0].toString(),
            sig_R8y: signature.R8[1].toString(),
            sig_S: signature.S.toString(),
            holder_sk: BigInt(holderKeyPair.privateKey[0]).toString(),
            holder_pk_x: holderKeyPair.publicKey[0].toString(),
            holder_pk_y: holderKeyPair.publicKey[1].toString(),
            partition_M: partitions.map((p) => p.M.toString()),
            partition_tau: partitions.map((p) => p.tau.toString()),
            partition_tags: partitions.map((p) => p.tags.toString()),
            partition_s: partitions.map((p) => p.s.toString()),
            partition_is_active: partitions.map((p) => p.is_active.toString()),
            merkle_paths: merkleProofs.map((proof) => {
                const padded = [...proof.pathElements];
                while (padded.length < this.d_s) padded.push(0n);
                return padded.map((e) => e.toString());
            }),
            merkle_indices: merkleProofs.map((proof) => {
                const padded = [...proof.pathIndices];
                while (padded.length < this.d_s) padded.push(0);
                return padded.map((i) => i.toString());
            }),
            k_amplification: '0',
            depth_parent_partition: Array(this.N_a).fill(parentCap.depth.toString()),
            depth_child_partition: Array(this.N_a).fill(childCap.depth.toString()),
        };
    }
}
