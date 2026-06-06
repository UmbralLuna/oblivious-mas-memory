// src/crypto/crypto.spec.ts

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
const expect = chai.expect;

import {
    poseidon1,
    poseidon2,
    poseidon3,
    poseidon4,
    poseidon5,
    poseidon8,
    poseidon9,
    poseidonHash,
    computeNullifier,
    hashCapability,
    hashTypeConstraint,
    hashPartitionLeaf,
} from './poseidon';
import { generateKeyPair, sign, verify } from './eddsa';
import {
    pedersenCommit,
    createCommitment,
    verifyCommitment,
    generatePedersenH,
    clearHCache,
    commitmentAdd,
    generateBlindingFactor,
} from './pedersen';
import {
    getBabyJub,
    getBasePoint,
    mulPointEscalar,
    addPoint,
    isOnCurve,
    isInSubgroup,
    derivePublicKey,
    BASE8,
    BABYJUB_SUBORDER,
} from './babyjub';

describe('Crypto Primitives', function () {
    this.timeout(120000);

    describe('BabyJubJub', () => {
        it('should initialize BabyJub instance', async () => {
            const bjj = await getBabyJub();
            expect(bjj).to.exist;
            expect(bjj.F).to.exist;
        });

        it('should return base point', async () => {
            const G = await getBasePoint();
            expect(G.x).to.be.a('bigint');
            expect(G.y).to.be.a('bigint');
            expect(G.x).to.equal(BASE8.x);
            expect(G.y).to.equal(BASE8.y);
        });

        it('should verify base point is on curve', async () => {
            const G = await getBasePoint();
            expect(await isOnCurve(G)).to.be.true;
        });

        it('should verify base point is in subgroup', async () => {
            const G = await getBasePoint();
            expect(await isInSubgroup(G)).to.be.true;
        });

        it('should perform scalar multiplication', async () => {
            const G = await getBasePoint();
            const result = await mulPointEscalar(G, 12345n);
            expect(result.x).to.be.a('bigint');
            expect(result.y).to.be.a('bigint');
            expect(await isOnCurve(result)).to.be.true;
        });

        it('should perform point addition', async () => {
            const G = await getBasePoint();
            const p1 = await mulPointEscalar(G, 100n);
            const p2 = await mulPointEscalar(G, 200n);
            const sum = await addPoint(p1, p2);
            const expected = await mulPointEscalar(G, 300n);
            expect(sum.x).to.equal(expected.x);
            expect(sum.y).to.equal(expected.y);
        });

        it('should derive public key from private key', async () => {
            const pk = await derivePublicKey(12345n);
            expect(pk.x).to.be.a('bigint');
            expect(pk.y).to.be.a('bigint');
            expect(await isInSubgroup(pk)).to.be.true;
        });
    });

    describe('Poseidon', () => {
        it('should hash consistently', async () => {
            const hash1 = await poseidon2(123n, 456n);
            const hash2 = await poseidon2(123n, 456n);
            expect(hash1).to.equal(hash2);
        });

        it('should produce different hashes for different inputs', async () => {
            const hash1 = await poseidon2(123n, 456n);
            const hash2 = await poseidon2(123n, 457n);
            expect(hash1).to.not.equal(hash2);
        });

        it('should support 1 input', async () => {
            const hash = await poseidon1(42n);
            expect(hash).to.be.a('bigint');
            expect(hash).to.not.equal(0n);
        });

        it('should support 2-9 inputs', async () => {
            const inputs = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n];
            expect(await poseidon2(inputs[0], inputs[1])).to.be.a('bigint');
            expect(await poseidon3(inputs[0], inputs[1], inputs[2])).to.be.a('bigint');
            expect(await poseidon4([inputs[0], inputs[1], inputs[2], inputs[3]])).to.be.a('bigint');
            expect(
                await poseidon5([inputs[0], inputs[1], inputs[2], inputs[3], inputs[4]])
            ).to.be.a('bigint');
            expect(await poseidon8(inputs.slice(0, 8))).to.be.a('bigint');
            expect(await poseidon9(inputs)).to.be.a('bigint');
        });

        it('should reject invalid input lengths', async () => {
            try {
                await poseidonHash([]);
                expect.fail('Should have thrown');
            } catch (err: any) {
                expect(err.message).to.include('1-16');
            }

            try {
                await poseidonHash(new Array(17).fill(1n));
                expect.fail('Should have thrown');
            } catch (err: any) {
                expect(err.message).to.include('1-16');
            }
        });

        it('should compute Nullifier correctly', async () => {
            const nf1 = await computeNullifier(0, 12345n, 67890n);
            const nf2 = await computeNullifier(0, 12345n, 67890n);
            const nf3 = await computeNullifier(1, 12345n, 67890n);
            expect(nf1).to.equal(nf2);
            expect(nf1).to.not.equal(nf3);
        });

        it('should hash capability with 8 fields', async () => {
            const hash = await hashCapability({
                iss: 1n,
                hld: 2n,
                scope_root: 3n,
                perm: 0xffffffffn,
                depth: 10n,
                exp: 1234567890n,
                attr_hash: 4n,
                tc_hash: 5n,
            });
            expect(hash).to.be.a('bigint');
        });

        it('should hash TypeConstraint', async () => {
            const hash = await hashTypeConstraint(2, 1, 0);
            expect(hash).to.be.a('bigint');
        });

        it('should hash Partition leaf', async () => {
            const leaf = await hashPartitionLeaf(100n, 0, 16, 200);
            expect(leaf).to.be.a('bigint');
        });
    });

    describe('EdDSA', () => {
        it('should generate valid key pair', async () => {
            const kp = await generateKeyPair('01');
            expect(kp.privateKey).to.be.instanceOf(Buffer);
            expect(kp.privateKey.length).to.equal(32);
            expect(kp.publicKey).to.be.an('array').with.lengthOf(2);
            expect(kp.publicKey[0]).to.be.a('bigint');
        });

        it('should produce deterministic key from seed', async () => {
            const kp1 = await generateKeyPair('1234');
            const kp2 = await generateKeyPair('1234');
            expect(kp1.publicKey[0]).to.equal(kp2.publicKey[0]);
            expect(kp1.publicKey[1]).to.equal(kp2.publicKey[1]);
        });

        it('should sign and verify correctly', async () => {
            const kp = await generateKeyPair('02');
            const message = await poseidon2(100n, 200n);
            const sig = await sign(kp.privateKey, message);
            expect(sig.R8x).to.be.a('bigint');
            const valid = await verify(kp.publicKey, message, sig);
            expect(valid).to.be.true;
        });

        it('should reject wrong signature', async () => {
            const kp = await generateKeyPair('03');
            const message = await poseidon2(100n, 200n);
            const sig = await sign(kp.privateKey, message);
            const tamperedSig = { ...sig, S: sig.S + 1n };
            const valid = await verify(kp.publicKey, message, tamperedSig);
            expect(valid).to.be.false;
        });

        it('should reject wrong message', async () => {
            const kp = await generateKeyPair('04');
            const message = await poseidon2(100n, 200n);
            const wrongMessage = await poseidon2(100n, 999n);
            const sig = await sign(kp.privateKey, message);
            const valid = await verify(kp.publicKey, wrongMessage, sig);
            expect(valid).to.be.false;
        });

        it('should reject wrong public key', async () => {
            const kp1 = await generateKeyPair('05');
            const kp2 = await generateKeyPair('06');
            const message = await poseidon2(100n, 200n);
            const sig = await sign(kp1.privateKey, message);
            const valid = await verify(kp2.publicKey, message, sig);
            expect(valid).to.be.false;
        });
    });

    describe('Pedersen', () => {
        before(() => {
            clearHCache();
        });

        it('should generate Pedersen H point', async () => {
            const H = await generatePedersenH('test-domain-v1');
            expect(H.x).to.be.a('bigint');
            expect(H.y).to.be.a('bigint');
            expect(await isOnCurve(H)).to.be.true;
        });

        it('should produce deterministic H from same domain', async () => {
            clearHCache();
            const H1 = await generatePedersenH('test-domain-v1');
            clearHCache();
            const H2 = await generatePedersenH('test-domain-v1');
            expect(H1.x).to.equal(H2.x);
            expect(H1.y).to.equal(H2.y);
        });

        it('should produce different H for different domains', async () => {
            clearHCache();
            const H1 = await generatePedersenH('domain-A');
            clearHCache();
            const H2 = await generatePedersenH('domain-B');
            expect(H1.x !== H2.x || H1.y !== H2.y).to.be.true;
        });

        it('should create commitment', async () => {
            clearHCache();
            const C = await pedersenCommit(12345n, 67890n);
            expect(C.x).to.be.a('bigint');
            expect(C.y).to.be.a('bigint');
            expect(await isOnCurve(C)).to.be.true;
        });

        it('should produce different commitments for different randomness', async () => {
            const C1 = await pedersenCommit(12345n, 100n);
            const C2 = await pedersenCommit(12345n, 200n);
            expect(C1.x !== C2.x || C1.y !== C2.y).to.be.true;
        });

        it('should verify valid commitment opening', async () => {
            clearHCache();
            const C = await pedersenCommit(42n, 99n);
            expect(await verifyCommitment(C, 42n, 99n)).to.be.true;
        });

        it('should reject invalid commitment opening', async () => {
            const C = await pedersenCommit(42n, 99n);
            expect(await verifyCommitment(C, 43n, 99n)).to.be.false;
            expect(await verifyCommitment(C, 42n, 100n)).to.be.false;
        });

        it('should support homomorphic addition', async () => {
            clearHCache();
            const C1 = await pedersenCommit(10n, 100n);
            const C2 = await pedersenCommit(20n, 200n);
            const Csum = await commitmentAdd(C1, C2);
            const Cexpected = await pedersenCommit(30n, 300n);
            expect(Csum.x).to.equal(Cexpected.x);
            expect(Csum.y).to.equal(Cexpected.y);
        });

        it('should generate random blinding factor in valid range', () => {
            const r = generateBlindingFactor();
            expect(r).to.be.a('bigint');
            expect(r >= 0n).to.be.true;
            expect(r < BABYJUB_SUBORDER).to.be.true;
        });
    });

    describe('Integration', () => {
        it('should sign a hashed capability', async () => {
            const kp = await generateKeyPair('integration-01');
            const capHash = await hashCapability({
                iss: 1n,
                hld: 2n,
                scope_root: 3n,
                perm: 0xffffffffn,
                depth: 10n,
                exp: 1234567890n,
                attr_hash: 4n,
                tc_hash: 5n,
            });
            const sig = await sign(kp.privateKey, capHash);
            expect(await verify(kp.publicKey, capHash, sig)).to.be.true;
        });

        it('should commit to an identity and verify', async () => {
            clearHCache();
            const kp = await generateKeyPair('integration-02');
            const id = await poseidon2(kp.publicKey[0], kp.publicKey[1]);
            const r = generateBlindingFactor();
            const commitment = await createCommitment(id, r);
            expect(await verifyCommitment(commitment.C, id, r)).to.be.true;
        });
    });
});
