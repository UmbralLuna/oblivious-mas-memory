// src/utils/jsonl_logger.ts
import { promises as fs } from 'fs';
import path from 'path';
/**
 * JSONL（JSON Lines）日志记录器
 * 用于实验数据持久化
 */
export class JSONLLogger {
    constructor(private filepath: string) {}
    /**
     * 记录单条记录
     */
    async log(record: Record<string, unknown>): Promise<void> {
        await fs.mkdir(path.dirname(this.filepath), { recursive: true });
        await fs.appendFile(this.filepath, JSON.stringify(record) + '\n', 'utf-8');
    }
    /**
     * 批量记录
     */
    async logBatch(records: Record<string, unknown>[]): Promise<void> {
        await fs.mkdir(path.dirname(this.filepath), { recursive: true });
        const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
        await fs.appendFile(this.filepath, lines, 'utf-8');
    }
    /**
     * 读取所有记录
     */
    async read(): Promise<Record<string, unknown>[]> {
        try {
            const content = await fs.readFile(this.filepath, 'utf-8');
            return content
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => JSON.parse(line));
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }
    /**
     * 清空日志
     */
    async clear(): Promise<void> {
        try {
            await fs.unlink(this.filepath);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw err;
            }
        }
    }
    /**
     * 获取文件大小
     */
    async size(): Promise<number> {
        try {
            const stats = await fs.stat(this.filepath);
            return stats.size;
        } catch {
            return 0;
        }
    }
    /**
     * 关闭日志（占位方法，文件自动关闭）
     */
    async close(): Promise<void> {
        // Node.js 的 fs.appendFile 会自动关闭文件
        // 这里是占位方法，保持接口一致性
    }
    /**
     * 获取文件路径
     */
    getPath(): string {
        return this.filepath;
    }
}
