// src/verifier/verifier.spec.ts
// Verifier 单元测试
// 规范 v4.0 §15.1

import { expect } from 'chai';
import { NullifierSet } from './nullifier_set';
import { RevokeList } from './revoke_list';
import { SessionTokenManager } from './session_token';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';

describe('Verifier', function () {
    this.timeout(15000);

    describe('NullifierSet', () => {
        let nfSet: NullifierSet;
        const dbPath = join(tmpdir(), `test-nf-${Date.now()}.db`);

        before(() => {
            nfSet = new NullifierSet(dbPath);
        });

        after(() => {
            nfSet.close();
            try {
                unlinkSync(dbPath);
            } catch {}
        });

        it('should add and check nullifier', () => {
            const nf = '0x1234567890abcdef';
            expect(nfSet.has(0, nf)).to.be.false;

            const added = nfSet.add(0, nf);
            expect(added).to.be.true;
            expect(nfSet.has(0, nf)).to.be.true;
        });

        it('should reject duplicate nullifier', () => {
            const nf = '0xdeadbeef';
            nfSet.add(0, nf);
            const added = nfSet.add(0, nf);
            expect(added).to.be.false;
        });

        it('should separate domains', () => {
            const nf = '0xcafebabe';
            nfSet.add(0, nf);
            expect(nfSet.has(0, nf)).to.be.true;
            expect(nfSet.has(1, nf)).to.be.false;
        });

        it('should count nullifiers', () => {
            nfSet.clear();
            nfSet.add(0, '0x1');
            nfSet.add(0, '0x2');
            nfSet.add(1, '0x3');
            expect(nfSet.count(0)).to.equal(2);
            expect(nfSet.count(1)).to.equal(1);
            expect(nfSet.count()).to.equal(3);
        });
    });

    describe('RevokeList', () => {
        it('should add and check revoked nullifier', () => {
            const rl = new RevokeList(10000, 7);
            const nf = '0x1234567890abcdef';

            expect(rl.has(nf)).to.be.false;
            rl.add(nf);
            expect(rl.has(nf)).to.be.true;
        });

        it('should have low false positive rate', () => {
            const rl = new RevokeList(100000, 7);
            for (let i = 0; i < 1000; i++) {
                rl.add(`nf-${i}`);
            }

            const fpr = rl.estimateFalsePositiveRate();
            expect(fpr).to.be.lessThan(0.01); // < 1%
        });

        it('should support remove', () => {
            const rl = new RevokeList(10000, 7);
            const nf = '0xabcdef';
            rl.add(nf);
            expect(rl.has(nf)).to.be.true;
            rl.remove(nf);
            expect(rl.has(nf)).to.be.false;
        });
    });

    describe('SessionTokenManager', () => {
        let stm: SessionTokenManager;

        before(() => {
            const secret = randomBytes(32);
            stm = new SessionTokenManager(secret, 300);
        });

        it('should issue valid token', () => {
            const stk = stm.issue('h_c_123', 'scope_abc', 'agent_xyz');
            expect(stk.sid).to.have.lengthOf(32);
            expect(stk.mac).to.have.lengthOf(64);
            expect(stk.exp).to.be.greaterThan(stk.issued_at);
        });

        it('should verify valid token', () => {
            const stk = stm.issue('h_c_456', 'scope_def', 'agent_uvw');
            const result = stm.verify(stk, 'scope_def', 'agent_uvw');
            expect(result.valid).to.be.true;
        });

        it('should reject expired token', async () => {
            const stm_short = new SessionTokenManager(randomBytes(32), 1);
            const stk = stm_short.issue('h_c_789', 'scope_ghi', 'agent_rst');

            // 等待 2.5 秒确保完全跨过秒边界
            await new Promise((resolve) => setTimeout(resolve, 2500));

            const result = stm_short.verify(stk, 'scope_ghi', 'agent_rst');
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('expired');
        });

        it('should reject scope mismatch', () => {
            const stk = stm.issue('h_c_abc', 'scope_1', 'agent_a');
            const result = stm.verify(stk, 'scope_2', 'agent_a');
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('scope_mismatch');
        });

        it('should reject agent mismatch', () => {
            const stk = stm.issue('h_c_def', 'scope_x', 'agent_b');
            const result = stm.verify(stk, 'scope_x', 'agent_c');
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('agent_mismatch');
        });

        it('should reject tampered MAC', () => {
            const stk = stm.issue('h_c_ghi', 'scope_y', 'agent_d');
            stk.mac = 'deadbeef'.repeat(8);
            const result = stm.verify(stk, 'scope_y', 'agent_d');
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('mac_invalid');
        });

        it('should refresh token', async () => {
            const stk1 = stm.issue('h_c_jkl', 'scope_z', 'agent_e');

            // 等待 1.1 秒确保跨过秒边界
            await new Promise((resolve) => setTimeout(resolve, 1100));

            const stk2 = stm.refresh(stk1);
            expect(stk2.sid).to.not.equal(stk1.sid);
            expect(stk2.h_c).to.equal(stk1.h_c);
            expect(stk2.exp).to.be.greaterThan(stk1.exp);
        });
    });
});
