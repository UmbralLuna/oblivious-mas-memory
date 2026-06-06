// src/memory_service/storage.ts
// 分区存储（按 (org, type) 分库）
// 规范 v4.0 §5.5

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * 记忆类型
 */
export enum MemoryType {
    Episodic = 0,
    Semantic = 1,
    Procedural = 2,
}

/**
 * 存储条目
 */
export interface StorageEntry {
    partition_id: string;
    org_id: string;
    mem_type: MemoryType;
    content: string;
    tags: number;
    sensitivity: number;
    created_at: number;
    updated_at: number;
    writer_id?: string; // 可选：写入者公开ID（明文模式）
    writer_commit?: string; // 可选：Pedersen 承诺（隐私模式）
}

/**
 * 分区存储（按 org + type 分表）
 */
export class PartitionStorage {
    private db: Database.Database;

    constructor(dbPath: string) {
        // 确保目录存在
        const dir = dirname(dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.initSchema();
    }

    private initSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS partitions (
                partition_id TEXT NOT NULL,
                org_id TEXT NOT NULL,
                mem_type INTEGER NOT NULL,
                content TEXT NOT NULL,
                tags INTEGER NOT NULL DEFAULT 0,
                sensitivity INTEGER NOT NULL DEFAULT 0,
                writer_id TEXT,
                writer_commit TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (partition_id, org_id, mem_type)
            );

            CREATE INDEX IF NOT EXISTS idx_org_type
                ON partitions(org_id, mem_type);

            CREATE INDEX IF NOT EXISTS idx_updated
                ON partitions(updated_at DESC);
        `);
    }

    /**
     * 写入分区
     */
    write(entry: Omit<StorageEntry, 'created_at' | 'updated_at'>): void {
        const now = Date.now();
        const stmt = this.db.prepare(`
            INSERT INTO partitions
                (partition_id, org_id, mem_type, content, tags, sensitivity,
                 writer_id, writer_commit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(partition_id, org_id, mem_type) DO UPDATE SET
                content = excluded.content,
                tags = excluded.tags,
                sensitivity = excluded.sensitivity,
                writer_id = excluded.writer_id,
                writer_commit = excluded.writer_commit,
                updated_at = excluded.updated_at
        `);

        stmt.run(
            entry.partition_id,
            entry.org_id,
            entry.mem_type,
            entry.content,
            entry.tags,
            entry.sensitivity,
            entry.writer_id ?? null,
            entry.writer_commit ?? null,
            now,
            now
        );
    }

    /**
     * 读取分区
     */
    read(partition_id: string, org_id: string, mem_type: MemoryType): StorageEntry | null {
        const stmt = this.db.prepare(`
            SELECT * FROM partitions
            WHERE partition_id = ? AND org_id = ? AND mem_type = ?
        `);
        const row = stmt.get(partition_id, org_id, mem_type) as any;
        if (!row) return null;

        return {
            partition_id: row.partition_id,
            org_id: row.org_id,
            mem_type: row.mem_type,
            content: row.content,
            tags: row.tags,
            sensitivity: row.sensitivity,
            writer_id: row.writer_id,
            writer_commit: row.writer_commit,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    /**
     * 列出组织的所有分区
     */
    listByOrg(org_id: string, mem_type?: MemoryType): StorageEntry[] {
        const stmt =
            mem_type !== undefined
                ? this.db.prepare(`SELECT * FROM partitions WHERE org_id = ? AND mem_type = ?`)
                : this.db.prepare(`SELECT * FROM partitions WHERE org_id = ?`);
        const rows =
            mem_type !== undefined
                ? (stmt.all(org_id, mem_type) as any[])
                : (stmt.all(org_id) as any[]);

        return rows.map((row) => ({
            partition_id: row.partition_id,
            org_id: row.org_id,
            mem_type: row.mem_type,
            content: row.content,
            tags: row.tags,
            sensitivity: row.sensitivity,
            writer_id: row.writer_id,
            writer_commit: row.writer_commit,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));
    }

    /**
     * 删除分区
     */
    delete(partition_id: string, org_id: string, mem_type: MemoryType): boolean {
        const stmt = this.db.prepare(`
            DELETE FROM partitions
            WHERE partition_id = ? AND org_id = ? AND mem_type = ?
        `);
        const result = stmt.run(partition_id, org_id, mem_type);
        return result.changes > 0;
    }

    /**
     * 获取分区总数
     */
    count(): number {
        const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM partitions');
        return (stmt.get() as any).cnt;
    }

    /**
     * 清空（仅测试用）
     */
    clear(): void {
        this.db.exec('DELETE FROM partitions');
    }

    /**
     * 关闭数据库
     */
    close(): void {
        this.db.close();
    }
}
