// src/memory_service/server.spec.ts
// 服务器集成测试

import { expect } from 'chai';
import request from 'supertest';
import { createApp } from './server';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import { randomBytes } from 'crypto';

describe('Memory Service', function () {
    this.timeout(10000);

    let app: any;
    let storage: any;
    let session_manager: any;
    let audit_log: any;
    let close: () => void;

    const nf_db = join(tmpdir(), `test-nf-${Date.now()}.db`);
    const storage_db = join(tmpdir(), `test-storage-${Date.now()}.db`);

    before(() => {
        const components = createApp({
            port: 0,
            nullifier_db_path: nf_db,
            storage_db_path: storage_db,
            delegate_vkey_path: 'nonexistent.json',
            write_vkey_path: 'nonexistent.json',
            session_secret: randomBytes(32),
            issuer_key: randomBytes(32),
        });

        app = components.app;
        storage = components.storage;
        session_manager = components.session_manager;
        audit_log = components.audit_log;
        close = components.close;
    });

    after(() => {
        close();
        try {
            unlinkSync(nf_db);
        } catch {}
        try {
            unlinkSync(storage_db);
        } catch {}
    });

    describe('GET /health', () => {
        it('should return ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('ok');
            expect(res.body).to.have.property('nullifier_count');
        });
    });

    describe('POST /verify-delegate', () => {
        it('should reject missing fields', async () => {
            const res = await request(app).post('/verify-delegate').send({});
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('missing_fields');
        });

        it('should reject invalid public signals', async () => {
            const res = await request(app)
                .post('/verify-delegate')
                .send({
                    proof: {},
                    publicSignals: ['0x1'],
                    agent_pk_hash: 'agent_1',
                });
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('invalid_public_signals');
        });
    });

    describe('POST /access', () => {
        it('should reject missing session token', async () => {
            const res = await request(app).post('/access').send({
                partition_id: 'p1',
                org_id: 'org1',
                mem_type: 0,
                scope_hash: 'hash1',
            });
            expect(res.status).to.equal(400);
        });

        it('should grant access with valid session token', async () => {
            storage.write({
                partition_id: 'p_test',
                org_id: 'org_test',
                mem_type: 0,
                content: 'test content',
                tags: 0,
                sensitivity: 100,
            });

            const scope_hash = 'scope_test';
            const agent_pk_hash = 'agent_test';
            const session_token = session_manager.issue('h_c_test', scope_hash, agent_pk_hash);

            const res = await request(app).post('/access').send({
                session_token,
                partition_id: 'p_test',
                org_id: 'org_test',
                mem_type: 0,
                scope_hash,
            });

            expect(res.status).to.equal(200);
            expect(res.body.content).to.equal('test content');
        });

        it('should reject scope mismatch', async () => {
            const session_token = session_manager.issue('h_c_x', 'scope_a', 'agent_x');
            const res = await request(app).post('/access').send({
                session_token,
                partition_id: 'p1',
                org_id: 'org1',
                mem_type: 0,
                scope_hash: 'scope_b',
            });
            expect(res.status).to.equal(401);
        });
    });

    describe('GET /audit-log', () => {
        it('should return audit entries', async () => {
            audit_log.append({
                event_type: 'delegate_verify',
                actor_pk_hash: 'agent_a',
                metadata: {},
            });

            const res = await request(app).get('/audit-log');
            expect(res.status).to.equal(200);
            expect(res.body.entries).to.be.an('array');
            expect(res.body.total).to.be.a('number');
        });

        it('should verify chain', async () => {
            audit_log.append({
                event_type: 'access_grant',
                actor_pk_hash: 'agent_b',
                metadata: {},
            });

            const res = await request(app).get('/audit-log?verify=true');
            expect(res.status).to.equal(200);
            expect(res.body.chain_valid).to.be.true;
        });

        it('should filter by event_type', async () => {
            const res = await request(app).get('/audit-log?event_type=delegate_verify');
            expect(res.status).to.equal(200);
            res.body.entries.forEach((e: any) => {
                expect(e.event_type).to.equal('delegate_verify');
            });
        });
    });
});
