// src/prover/prover.spec.ts
// Prover 单元测试
// 规范 v4.0 §15.1

import { expect } from 'chai';
import { buildDelegateWitness } from './witness_builder_delegate';
import { buildWriteWitness } from './witness_builder_write';
import type { Capability } from './types';
import { TypeConstraintPolicy } from './types';
import { derivePublicKey } from '../crypto/babyjub';
import { poseidon2 } from '../crypto/poseidon';

describe('Prover', function () {
    this.timeout(30000);

    describe('Witness Builder - Delegate', () => {
        it('should build valid delegate witness', async () => {
            // 派生持有者公钥并计算正确的 hld
            const holder_sk = 42n;
            const holder_pk = await derivePublicKey(holder_sk);
            const correct_hld = await poseidon2(holder_pk.x, holder_pk.y);

            const cap_parent: Capability = {
                iss: 1n,
                hld: correct_hld, // ✅ 使用计算出的正确值
                scope: { root: 100n, partitions: [] },
                perm: 0xffffffff,
                depth: 10,
                exp: Math.floor(Date.now() / 1000) + 3600,
                attr_hash: 3n,
                tc: {
                    episodic: TypeConstraintPolicy.Allow,
                    semantic: TypeConstraintPolicy.Allow,
                    procedural: TypeConstraintPolicy.Allow,
                },
            };

            const cap_child: Capability = {
                iss: 1n,
                hld: correct_hld, // ✅ 使用计算出的正确值
                scope: { root: 200n, partitions: [] },
                perm: 0x3,
                depth: 5,
                exp: Math.floor(Date.now() / 1000) + 1800,
                attr_hash: 4n,
                tc: {
                    episodic: TypeConstraintPolicy.Restrict,
                    semantic: TypeConstraintPolicy.Allow,
                    procedural: TypeConstraintPolicy.Deny,
                },
            };

            const sig = { R8x: 10n, R8y: 11n, S: 12n };
            const merkle_paths: bigint[][] = [];
            const merkle_indices: number[][] = [];
            const depth_parent = [10, 10, 10, 10];
            const depth_child = [5, 5, 5, 5];
            const k = 256;
            const randomness = 999n;
            const current_time = Math.floor(Date.now() / 1000);

            const witness = await buildDelegateWitness(
                cap_parent,
                cap_child,
                sig,
                holder_sk,
                merkle_paths,
                merkle_indices,
                depth_parent,
                depth_child,
                k,
                randomness,
                                current_time,
                { x: 1234n, y: 5678n } // issuer_pk (test placeholder)
            );

            expect(witness).to.have.property('h_c');
            expect(witness).to.have.property('nullifier');
            expect(witness.partition_M).to.have.lengthOf(16);
            expect(witness.merkle_paths).to.have.lengthOf(16);
        });
    });

    describe('Witness Builder - Write', () => {
        it('should build valid write witness', async () => {
            const holder_sk = 42n;
            const holder_pk = await derivePublicKey(holder_sk);
            const correct_hld = await poseidon2(holder_pk.x, holder_pk.y);

            const cap: Capability = {
                iss: 1n,
                hld: correct_hld, // ✅ 使用计算出的正确值
                scope: { root: 100n, partitions: [] },
                perm: 0x2,
                depth: 10,
                exp: Math.floor(Date.now() / 1000) + 3600,
                attr_hash: 3n,
                tc: {
                    episodic: TypeConstraintPolicy.Allow,
                    semantic: TypeConstraintPolicy.Allow,
                    procedural: TypeConstraintPolicy.Allow,
                },
            };

            const sig = { R8x: 10n, R8y: 11n, S: 12n };
            const M_target = 500n;
            const tau_target = 0;
            const target_tags = 0;
            const target_s = 100;
            const merkle_path: bigint[] = [];
            const merkle_index: number[] = [];
            const id_writer = correct_hld; // ✅ id_writer = Poseidon(holder_pk)
            const r_pedersen = 999n;
            const H = { x: 1000n, y: 1001n };
            const randomness_h = 888n;
            const current_time = Math.floor(Date.now() / 1000);

            const witness = await buildWriteWitness(
                cap,
                sig,
                M_target,
                tau_target,
                target_tags,
                target_s,
                merkle_path,
                merkle_index,
                holder_sk,
                id_writer,
                r_pedersen,
                H,
                randomness_h,
                                current_time,
                { x: 1234n, y: 5678n } // issuer_pk (test placeholder)
            );

            expect(witness).to.have.property('h_w');
            expect(witness).to.have.property('C_w');
            expect(witness).to.have.property('nullifier_w');
            expect(witness.merkle_path).to.have.lengthOf(6);
        });
    });
});
