import { buildPoseidon } from 'circomlibjs';

export class WitnessBuilderDelegate {
    private N: number;
    private d: number;
    private poseidon: any;

    constructor(N: number, d: number) {
        this.N = N;
        this.d = d;
    }

    async init() {
        this.poseidon = await buildPoseidon();
    }

    async buildValidDelegation(seed: number): Promise<Record<string, any>> {
        if (!this.poseidon) await this.init();

        // 生成随机但有效的witness
        const pk = this.randomField(seed);
        const scope = Array(this.N).fill(0).map((_, i) => this.randomField(seed + i + 1));
        const delegation_chain = Array(this.d).fill(0).map((_, i) => this.randomField(seed + i + 100));
        const memory_type = 1; // episodic
        const timestamp = Math.floor(Date.now() / 1000);
        const nullifier = this.randomField(seed + 1000);

        // 计算Pedersen哈希（简化版：用Poseidon代替）
        const pk_hash = this.poseidon.F.toString(this.poseidon([pk]));

        // 构建Merkle proof（简化版：全0）
        const scope_root = this.poseidon.F.toString(this.poseidon(scope.slice(0, 4)));
        const scope_path_elements = Array(8).fill(0).map(() => this.randomField(seed + 2000));
        const scope_path_indices = Array(8).fill(0);

        return {
            pk,
            pk_hash,
            scope_root,
            scope_path_elements,
            scope_path_indices,
            delegation_chain,
            memory_type,
            timestamp,
            nullifier,
            // 其他必需字段
            partition_id: this.randomField(seed + 3000),
            operation: 1, // read
        };
    }

    async buildInvalidDelegation(seed: number, invalidType: string): Promise<Record<string, any>> {
        const valid = await this.buildValidDelegation(seed);

        switch (invalidType) {
            case 'wrong_pk_hash':
                valid.pk_hash = this.randomField(seed + 9999);
                break;
            case 'wrong_scope':
                valid.scope_root = this.randomField(seed + 9998);
                break;
            case 'expired_timestamp':
                valid.timestamp = 0;
                break;
            case 'wrong_type':
                valid.memory_type = 99;
                break;
            default:
                valid.nullifier = 0; // invalid nullifier
        }

        return valid;
    }

    private randomField(seed: number): string {
        const buf = Buffer.alloc(32);
        buf.writeUInt32BE(seed, 0);
        const hash = require('crypto').createHash('sha256').update(buf).digest();
        return BigInt('0x' + hash.toString('hex')).toString();
    }
}
