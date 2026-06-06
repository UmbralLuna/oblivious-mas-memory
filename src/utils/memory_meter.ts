// src/utils/memory_meter.ts
// 内存峰值测量（/usr/bin/time -v 包装）
// 规范 v4.0 §3.6

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MemoryMetrics {
    peak_rss_kb: number;
    peak_rss_mb: number;
    user_time_s: number;
    system_time_s: number;
    wall_time_s: number;
}

/**
 * 使用 /usr/bin/time -v 测量命令的内存峰值
 *
 * 注意：仅在 Linux 上可用。Windows 上返回 null。
 */
export async function measureMemory(command: string): Promise<MemoryMetrics | null> {
    // Windows 不支持 /usr/bin/time
    if (process.platform === 'win32') {
        return null;
    }

    try {
        const { stdout, stderr } = await execAsync(`/usr/bin/time -v ${command} 2>&1`);
        const output = stdout + stderr;

        // 解析输出
        const rss_match = output.match(/Maximum resident set size \(kbytes\): (\d+)/);
        const user_match = output.match(/User time \(seconds\): ([\d.]+)/);
        const system_match = output.match(/System time \(seconds\): ([\d.]+)/);
        const wall_match = output.match(
            /Elapsed \(wall clock\) time \(h:mm:ss or m:ss\): ([\d:.]+)/
        );

        if (!rss_match) {
            throw new Error('Failed to parse memory metrics');
        }

        const peak_rss_kb = parseInt(rss_match[1], 10);
        const user_time_s = user_match ? parseFloat(user_match[1]) : 0;
        const system_time_s = system_match ? parseFloat(system_match[1]) : 0;

        // 解析 wall time（格式：h:mm:ss 或 m:ss）
        let wall_time_s = 0;
        if (wall_match) {
            const parts = wall_match[1].split(':').map(parseFloat);
            if (parts.length === 3) {
                wall_time_s = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                wall_time_s = parts[0] * 60 + parts[1];
            } else {
                wall_time_s = parts[0];
            }
        }

        return {
            peak_rss_kb,
            peak_rss_mb: peak_rss_kb / 1024,
            user_time_s,
            system_time_s,
            wall_time_s,
        };
    } catch (err) {
        console.error('measureMemory failed:', err);
        return null;
    }
}
