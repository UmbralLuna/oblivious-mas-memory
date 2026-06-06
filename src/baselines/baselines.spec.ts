// src/baselines/baselines.spec.ts
// 基线单元测试

import { expect } from 'chai';
import { NoACEnforcer } from './no_ac/enforce';
import { RBACEnforcer } from './rbac/enforce';
import { ABACEngine } from './abac/attribute_engine';
import { CollaborativeMemoryAC } from './collaborative_memory/access_control';
import { AIPVerifier, IBCT } from './aip/ibct_verify';
import { FlatZKPEnforcer } from './flat_zkp/enforce';
import { PlaintextScopeEnforcer } from './plaintext_scope/enforce';
import { PlaintextIdEnforcer } from './plaintext_id/enforce';
import { generateKeyPair, sign } from '../crypto/eddsa';

describe('Baselines', function () {
    this.timeout(10000);

    describe('NoACEnforcer', () => {
        it('should allow all requests', () => {
            const e = new NoACEnforcer();
            const result = e.enforce({
                agent_id: 'any',
                partition_id: 'any',
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });
    });

    describe('RBACEnforcer', () => {
        let e: RBACEnforcer;

        before(() => {
            e = new RBACEnforcer();
        });

        it('should allow rd_dept to read rd_project_records', () => {
            const result = e.enforce({
                agent_role: 'rd_dept',
                partition_id: 'rd_project_records',
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });

        it('should deny rd_dept to access finance_records', () => {
            const result = e.enforce({
                agent_role: 'rd_dept',
                partition_id: 'finance_records',
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('partition_not_in_role');
        });

        it('should deny unknown role', () => {
            const result = e.enforce({
                agent_role: 'unknown',
                partition_id: 'any',
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('unknown_role');
        });

        it('should deny write to readonly partition', () => {
            const result = e.enforce({
                agent_role: 'rd_dept',
                partition_id: 'company_knowledge_base',
                operation: 'write',
            });
            expect(result.allowed).to.be.false;
        });

        it('should have 5 roles', () => {
            expect(e.getAllRoles()).to.have.lengthOf(5);
        });
    });

    describe('ABACEngine', () => {
        let e: ABACEngine;

        before(() => {
            e = new ABACEngine();
        });

        it('should allow same department', () => {
            const result = e.enforce({
                agent_id: 'a1',
                agent_dept: 'rd',
                partition_id: 'p1',
                partition_dept: 'rd',
                partition_type: 'episodic',
                partition_sensitivity: 0.8,
                partition_sanitized: false,
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });

        it('should deny high sensitivity cross-dept', () => {
            const result = e.enforce({
                agent_id: 'a1',
                agent_dept: 'marketing',
                partition_id: 'p1',
                partition_dept: 'finance',
                partition_type: 'episodic',
                partition_sensitivity: 0.9,
                partition_sanitized: false,
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
        });

        it('should allow public read', () => {
            const result = e.enforce({
                agent_id: 'a1',
                agent_dept: 'rd',
                partition_id: 'p1',
                partition_dept: 'public',
                partition_type: 'semantic',
                partition_sensitivity: 0.1,
                partition_sanitized: false,
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });
    });

    describe('CollaborativeMemoryAC', () => {
        let ac: CollaborativeMemoryAC;

        before(() => {
            ac = new CollaborativeMemoryAC();
            ac.setPolicy('p1', ['user1', 'user2'], 'episodic');
            ac.setPolicy('p2', ['user3'], 'semantic', true);
        });

        it('should allow authorized user', () => {
            const result = ac.checkAccess({
                user_id: 'user1',
                partition_id: 'p1',
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });

        it('should deny unauthorized user', () => {
            const result = ac.checkAccess({
                user_id: 'user999',
                partition_id: 'p1',
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
        });

        it('should deny write to readonly partition', () => {
            const result = ac.checkAccess({
                user_id: 'user3',
                partition_id: 'p2',
                operation: 'write',
            });
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('readonly_partition');
        });

        it('should handle unknown partition', () => {
            const result = ac.checkAccess({
                user_id: 'user1',
                partition_id: 'unknown',
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
        });
    });

    describe('AIPVerifier', () => {
        let v: AIPVerifier;
        let valid_token: IBCT;

        before(async () => {
            v = new AIPVerifier();

            const kp = await generateKeyPair('aip-test-seed');
            const msg = AIPVerifier.computeMessageHash(
                ['resource1', 'resource2'],
                ['read'],
                Math.floor(Date.now() / 1000) + 3600
            );
            const sig = await sign(kp.privateKey, msg);

            valid_token = {
                scope: ['resource1', 'resource2'],
                permissions: ['read'],
                expiration: Math.floor(Date.now() / 1000) + 3600,
                issuer_pk: kp.publicKey,
                signature: sig,
            };
        });

        it('should verify valid token', async () => {
            const result = await v.verify(
                valid_token,
                'resource1',
                'read',
                Math.floor(Date.now() / 1000)
            );
            expect(result.valid).to.be.true;
        });

        it('should reject expired token', async () => {
            const result = await v.verify(
                valid_token,
                'resource1',
                'read',
                valid_token.expiration + 1
            );
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('expired');
        });

        it('should reject resource not in scope', async () => {
            const result = await v.verify(
                valid_token,
                'resource_unknown',
                'read',
                Math.floor(Date.now() / 1000)
            );
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('resource_not_in_scope');
        });

        it('should reject disallowed operation', async () => {
            const result = await v.verify(
                valid_token,
                'resource1',
                'write',
                Math.floor(Date.now() / 1000)
            );
            expect(result.valid).to.be.false;
            expect(result.reason).to.equal('operation_not_allowed');
        });
    });

    describe('FlatZKPEnforcer', () => {
        let e: FlatZKPEnforcer;

        before(() => {
            e = new FlatZKPEnforcer();
        });

        it('should allow valid request', () => {
            const result = e.enforce({
                proof_valid: true,
                has_perm: true,
                depth_valid: true,
                exp_valid: true,
            });
            expect(result.allowed).to.be.true;
        });

        it('should reject invalid proof', () => {
            const result = e.enforce({
                proof_valid: false,
                has_perm: true,
                depth_valid: true,
                exp_valid: true,
            });
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('invalid_proof');
        });

        it('should reject expired', () => {
            const result = e.enforce({
                proof_valid: true,
                has_perm: true,
                depth_valid: true,
                exp_valid: false,
            });
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('expired');
        });
    });

    describe('PlaintextScopeEnforcer', () => {
        let e: PlaintextScopeEnforcer;

        before(() => {
            e = new PlaintextScopeEnforcer();
        });

        it('should allow in-scope access', () => {
            const result = e.enforce({
                agent_scope: ['r1', 'r2', 'r3'],
                required_resource: 'r2',
                operation: 'read',
            });
            expect(result.allowed).to.be.true;
        });

        it('should deny out-of-scope access', () => {
            const result = e.enforce({
                agent_scope: ['r1', 'r2'],
                required_resource: 'r99',
                operation: 'read',
            });
            expect(result.allowed).to.be.false;
        });
    });

    describe('PlaintextIdEnforcer', () => {
        let e: PlaintextIdEnforcer;

        before(() => {
            e = new PlaintextIdEnforcer();
        });

        it('should record writer id in plaintext', () => {
            const result = e.enforce({
                writer_id: 'alice',
                partition_id: 'p1',
                content: 'content',
                allowed_writers: new Set(['alice', 'bob']),
            });
            expect(result.allowed).to.be.true;
            expect(result.recorded_writer_id).to.equal('alice');
        });

        it('should deny unauthorized writer', () => {
            const result = e.enforce({
                writer_id: 'eve',
                partition_id: 'p1',
                content: 'content',
                allowed_writers: new Set(['alice']),
            });
            expect(result.allowed).to.be.false;
        });
    });
});
