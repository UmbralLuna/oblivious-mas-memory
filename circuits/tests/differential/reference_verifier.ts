// 参考验证器（TypeScript实现，用于差分测试）
import { buildPoseidon } from 'circomlibjs';

export class ReferenceDelegateVerifier {
    private poseidon: any;

    async init() {
        if (!this.poseidon) {
            this.poseidon = await buildPoseidon();
        }
    }

    async verify(input: any): Promise<{ valid: boolean; reason?: string }> {
        await this.init();

        try {
            // 1. 检查pk_hash是否匹配（关键检查）
            if (!input.pk || !input.pk_hash) {
                return { valid: false, reason: 'missing pk or pk_hash' };
            }

            // 计算pk的哈希
            const computed_pk_hash = this.poseidon.F.toString(this.poseidon([BigInt(input.pk)]));
            if (computed_pk_hash !== input.pk_hash) {
                return { valid: false, reason: 'pk_hash mismatch' };
            }

            // 2. 检查scope_root（简化：只检查是否为0）
            if (!input.scope_root || input.scope_root === '0') {
                return { valid: false, reason: 'invalid scope_root' };
            }

            // 3. 检查delegation_chain
            if (!input.delegation_chain || input.delegation_chain.length === 0) {
                return { valid: false, reason: 'empty delegation chain' };
            }

            // 检查delegation_chain中是否有0
            for (const elem of input.delegation_chain) {
                if (elem === '0' || elem === 0) {
                    return { valid: false, reason: 'invalid delegation chain element' };
                }
            }

            // 4. 检查memory_type
            if (![1, 2, 3].includes(Number(input.memory_type))) {
                return { valid: false, reason: 'invalid memory type' };
            }

            // 5. 检查timestamp
            const now = Math.floor(Date.now() / 1000);
            const ts = Number(input.timestamp);
            if (ts === 0 || ts > now + 3600 || ts < now - 86400 * 365) {
                return { valid: false, reason: 'timestamp out of range' };
            }

            // 6. 检查nullifier
            if (!input.nullifier || input.nullifier === '0' || input.nullifier === 0) {
                return { valid: false, reason: 'invalid nullifier' };
            }

            // 7. 检查partition_id
            if (!input.partition_id || input.partition_id === '0') {
                return { valid: false, reason: 'invalid partition_id' };
            }

            return { valid: true };
        } catch (err) {
            return { valid: false, reason: (err as Error).message };
        }
    }
}
