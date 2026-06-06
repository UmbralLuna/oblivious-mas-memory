// src/crypto/nothing_up_my_sleeve.ts
// "Nothing-up-my-sleeve" 参数生成
// 规范 v4.0 §5.7: Pedersen H 点在 setup 阶段一次性生成

import { generatePedersenH } from './pedersen';
import type { Point } from './babyjub';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Pedersen H 点配置文件
 */
export interface PedersenHConfig {
    domain: string;
    H_x: string;
    H_y: string;
    generated_at: string;
    description: string;
}

const DEFAULT_DOMAIN = 'oblivious-mas-memory-pedersen-h-v1';
const DEFAULT_PATH = path.join('artifacts', 'keys', 'pedersen_h.json');

/**
 * 确保 Pedersen H 点存在（如果不存在则生成并保存）
 */
export async function ensurePedersenH(
    filepath: string = DEFAULT_PATH,
    domain: string = DEFAULT_DOMAIN
): Promise<Point> {
    // 如果文件已存在，直接加载
    if (existsSync(filepath)) {
        return loadPedersenH(filepath);
    }

    // 生成新的 H 点
    console.log(`Generating Pedersen H point (domain: ${domain})...`);
    const H = await generatePedersenH(domain);

    // 保存到文件
    const config: PedersenHConfig = {
        domain,
        H_x: H.x.toString(),
        H_y: H.y.toString(),
        generated_at: new Date().toISOString(),
        description:
            'Pedersen H point for commitment scheme. Generated deterministically from domain string (nothing-up-my-sleeve).',
    };

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(config, null, 2), 'utf-8');

    console.log(`✓ Pedersen H point saved to ${filepath}`);
    console.log(`  H.x = ${H.x.toString().substring(0, 20)}...`);
    console.log(`  H.y = ${H.y.toString().substring(0, 20)}...`);

    return H;
}

/**
 * 加载 Pedersen H 点
 */
export async function loadPedersenH(filepath: string = DEFAULT_PATH): Promise<Point> {
    if (!existsSync(filepath)) {
        throw new Error(
            `Pedersen H file not found: ${filepath}. ` +
                `Run ensurePedersenH() first or 'npm run setup:pedersen'`
        );
    }

    const content = await fs.readFile(filepath, 'utf-8');
    const config: PedersenHConfig = JSON.parse(content);

    return {
        x: BigInt(config.H_x),
        y: BigInt(config.H_y),
    };
}

/**
 * 验证 Pedersen H 点的正确性（重新生成并比对）
 */
export async function verifyPedersenH(filepath: string = DEFAULT_PATH): Promise<boolean> {
    const config: PedersenHConfig = JSON.parse(await fs.readFile(filepath, 'utf-8'));

    // 重新生成
    const regenerated = await generatePedersenH(config.domain);

    return regenerated.x.toString() === config.H_x && regenerated.y.toString() === config.H_y;
}

/**
 * 获取 Pedersen H 配置信息（用于显示）
 */
export async function getPedersenHInfo(filepath: string = DEFAULT_PATH): Promise<PedersenHConfig> {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
}

/**
 * CLI 入口：如果直接运行此文件
 */
if (require.main === module) {
    ensurePedersenH()
        .then((H) => {
            console.log('\n✓ Pedersen H point ready');
            console.log(`  H.x = ${H.x.toString()}`);
            console.log(`  H.y = ${H.y.toString()}`);
            process.exit(0);
        })
        .catch((err) => {
            console.error('Error:', err);
            process.exit(1);
        });
}
