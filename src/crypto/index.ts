// src/crypto/index.ts
// 密码学库统一导出

// BabyJubJub
export * from './babyjub';

// Poseidon
export {
    getPoseidon,
    poseidonHash,
    poseidon1,
    poseidon2,
    poseidon3,
    poseidon4,
    poseidon5,
    poseidon6,
    poseidon8,
    poseidon9,
    computeNullifier,
    hashCapability,
    hashCapabilityWithRandomness,
    hashTypeConstraint,
    hashPartitionLeaf,
} from './poseidon';
export type { CapabilityFields } from './poseidon';

// EdDSA
export {
    getEddsa,
    generateKeyPair,
    sign,
    verify,
    publicKeyToPoint,
    pointToPublicKey,
    EDDSA_SIGNATURE_BYTES,
    EDDSA_PUBLIC_KEY_BYTES,
} from './eddsa';
export type { EdDSAKeyPair, EdDSASignature } from './eddsa';

// Pedersen
export {
    generatePedersenH,
    pedersenCommit,
    createCommitment,
    verifyCommitment,
    commitmentAdd,
    generateBlindingFactor,
    getCachedH,
    clearHCache,
} from './pedersen';
export type { PedersenCommitment } from './pedersen';

// Nothing-up-my-sleeve
export {
    ensurePedersenH,
    loadPedersenH,
    verifyPedersenH,
    getPedersenHInfo,
} from './nothing_up_my_sleeve';
export type { PedersenHConfig } from './nothing_up_my_sleeve';
