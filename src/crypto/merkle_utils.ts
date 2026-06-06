// src/crypto/merkle_utils.ts
import { Poseidon } from './poseidon_utils';

export interface MerkleProof {
    leaf: bigint;
    pathElements: bigint[];
    pathIndices: number[];
    root: bigint;
}

export class MerkleTree {
    private leaves: bigint[];
    private depth: number;

    constructor(depth: number) {
        this.depth = depth;
        this.leaves = [];
    }

    addLeaf(leaf: bigint): void {
        this.leaves.push(leaf);
    }

    async getRoot(): Promise<bigint> {
        if (this.leaves.length === 0) return 0n;
        const size = 1 << this.depth;
        const paddedLeaves = [...this.leaves];
        while (paddedLeaves.length < size) paddedLeaves.push(0n);

        let currentLevel = paddedLeaves;
        for (let level = 0; level < this.depth; level++) {
            const nextLevel: bigint[] = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const parent = await Poseidon.hashN([currentLevel[i], currentLevel[i + 1]]);
                nextLevel.push(parent);
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }

    async getProof(leafIndex: number): Promise<MerkleProof> {
        if (leafIndex >= this.leaves.length) {
            throw new Error(`Leaf index ${leafIndex} out of bounds`);
        }

        const size = 1 << this.depth;
        const paddedLeaves = [...this.leaves];
        while (paddedLeaves.length < size) paddedLeaves.push(0n);

        const pathElements: bigint[] = [];
        const pathIndices: number[] = [];
        let currentLevel = paddedLeaves;
        let currentIndex = leafIndex;

        for (let level = 0; level < this.depth; level++) {
            const isRight = currentIndex % 2 === 1;
            const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
            pathElements.push(currentLevel[siblingIndex]);
            pathIndices.push(isRight ? 1 : 0);

            const nextLevel: bigint[] = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const parent = await Poseidon.hashN([currentLevel[i], currentLevel[i + 1]]);
                nextLevel.push(parent);
            }
            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }

        const root = await this.getRoot();
        return { leaf: this.leaves[leafIndex], pathElements, pathIndices, root };
    }

    static async verifyProof(proof: MerkleProof): Promise<boolean> {
        let current = proof.leaf;
        for (let i = 0; i < proof.pathElements.length; i++) {
            const sibling = proof.pathElements[i];
            const isRight = proof.pathIndices[i] === 1;
            if (isRight) {
                current = await Poseidon.hashN([sibling, current]);
            } else {
                current = await Poseidon.hashN([current, sibling]);
            }
        }
        return current === proof.root;
    }
}
