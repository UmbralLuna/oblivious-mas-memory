// src/utils/logger.ts

import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

/**
 * Winston 日志记录器
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'oblivious-mas-memory' },
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${level}] ${message}${metaStr}`;
                })
            ),
        }),

        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
        }),

        // 综合日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        }),
    ],
});

// 测试环境静默
if (process.env.NODE_ENV === 'test') {
    logger.transports.forEach((t) => {
        t.silent = true;
    });
}

/**
 * 创建子日志记录器
 */
export function createChildLogger(component: string): winston.Logger {
    return logger.child({ component });
}
