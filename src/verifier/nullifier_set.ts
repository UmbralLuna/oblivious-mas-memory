// src/verifier/nullifier_set.ts
// Nullifier 集合（SQLite 持久化）
// 规范 v4.0 §5.3

import Database from 'better-sqlite3';

export class NullifierSet {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS nullifiers (
                domain INTEGER NOT NULL,
                nf TEXT NOT NULL,
                added_at INTEGER NOT NULL,
                PRIMARY KEY (domain, nf)
            ) WITHOUT ROWID;
        `);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
    }

    /**
     * 检查 nullifier 是否已存在
     */
    has(domain: 0 | 1, nf: string): boolean {
        const stmt = this.db.prepare('SELECT 1 FROM nullifiers WHERE domain = ? AND nf = ?');
        return !!stmt.get(domain, nf);
    }

    /**
     * 添加 nullifier
     * @returns true 如果成功添加，false 如果已存在
     */
    add(domain: 0 | 1, nf: string): boolean {
        try {
            const stmt = this.db.prepare(
                'INSERT INTO nullifiers (domain, nf, added_at) VALUES (?, ?, ?)'
            );
            stmt.run(domain, nf, Date.now());
            return true;
        } catch (err: any) {
            // better-sqlite3 throws SqliteError with code like SQLITE_CONSTRAINT_PRIMARYKEY
            if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
                return false;
            }
            throw err;
        }
    }

    /**
     * 获取 nullifier 数量
     */
    count(domain?: 0 | 1): number {
        if (domain !== undefined) {
            const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM nullifiers WHERE domain = ?');
            return (stmt.get(domain) as any).cnt;
        } else {
            const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM nullifiers');
            return (stmt.get() as any).cnt;
        }
    }

    /**
     * 清空（仅测试用）
     */
    clear(): void {
        this.db.exec('DELETE FROM nullifiers');
    }

    /**
     * 关闭数据库
     */
    close(): void {
        this.db.close();
    }
}
