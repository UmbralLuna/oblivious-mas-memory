// src/utils/machine_info.ts

import os from 'os';
import { execSync } from 'child_process';

/**
 * 机器信息
 */
export interface MachineInfo {
    cpu_model: string;
    cpu_cores_physical: number;
    cpu_cores_logical: number;
    cpu_freq_mhz: number;
    ram_total_gb: number;
    os_type: string;
    os_release: string;
    os_platform: string;
    kernel: string;
    node_version: string;
    circom_version: string;
    snarkjs_version: string;
    git_commit: string;
    git_dirty: boolean;
    timestamp_iso: string;
    hostname: string;
}

/**
 * 收集机器信息（用于实验记录）
 */
export function collectMachineInfo(): MachineInfo {
    const cpus = os.cpus();

    // Git 信息
    let git_commit = 'unknown';
    let git_dirty = false;

    try {
        git_commit = execSync('git rev-parse --short HEAD', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        const status = execSync('git status --porcelain', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
        });
        git_dirty = status.length > 0;
    } catch {
        // Git 不可用
    }

    // Circom 版本
    let circom_version = 'unknown';
    try {
        const output = execSync('circom --version', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
        });
        const match = output.match(/circom compiler (\S+)/);
        circom_version = match ? match[1] : output.trim();
    } catch {
        // Circom 未安装
    }

    // snarkjs 版本
    let snarkjs_version = 'unknown';
    try {
        const output = execSync('snarkjs --version', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
        });
        snarkjs_version = output.trim();
    } catch {
        // snarkjs 未安装
    }

    return {
        cpu_model: cpus[0]?.model || 'unknown',
        cpu_cores_physical: cpus.length,
        cpu_cores_logical: cpus.length,
        cpu_freq_mhz: cpus[0]?.speed || 0,
        ram_total_gb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
        os_type: os.type(),
        os_release: os.release(),
        os_platform: os.platform(),
        kernel: os.release(),
        node_version: process.version,
        circom_version,
        snarkjs_version,
        git_commit,
        git_dirty,
        timestamp_iso: new Date().toISOString(),
        hostname: os.hostname(),
    };
}

/**
 * 格式化输出
 */
export function formatMachineInfo(info: MachineInfo): string {
    return `
Machine Information:
  CPU: ${info.cpu_model}
  Cores: ${info.cpu_cores_logical} logical
  Frequency: ${info.cpu_freq_mhz} MHz
  RAM: ${info.ram_total_gb} GB
  OS: ${info.os_type} ${info.os_release} (${info.os_platform})
  Node.js: ${info.node_version}
  Circom: ${info.circom_version}
  snarkjs: ${info.snarkjs_version}
  Git: ${info.git_commit}${info.git_dirty ? ' (dirty)' : ''}
  Hostname: ${info.hostname}
  Timestamp: ${info.timestamp_iso}
`.trim();
}
