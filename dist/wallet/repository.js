import { randomUUID } from "node:crypto";
export class InMemoryWalletRepository {
    wallets = new Map();
    ledger = [];
    nextSeq = 1;
    idempotency = new Map();
    async createWallet(wallet) {
        if (this.wallets.has(wallet.userId)) {
            throw new Error(`Wallet already exists: ${wallet.userId}`);
        }
        this.wallets.set(wallet.userId, wallet);
    }
    async getWallet(userId) {
        return this.wallets.get(userId) ?? null;
    }
    async listLedgerForWallet(userId) {
        return this.ledger.filter((e) => e.walletUserId === userId);
    }
    async listAllLedger() {
        return [...this.ledger];
    }
    async appendEntries(entries) {
        for (const e of entries) {
            this.ledger.push(e);
        }
        this.ledger.sort((a, b) => a.sequence - b.sequence);
    }
    async removeEntriesByCorrelationId(correlationId) {
        this.ledger = this.ledger.filter((e) => e.correlationId !== correlationId);
    }
    async allocateSequences(count) {
        const start = this.nextSeq;
        if (count > 0) {
            this.nextSeq += count;
        }
        return start;
    }
    async getIdempotency(key) {
        return this.idempotency.get(key) ?? null;
    }
    async putIdempotency(key, record) {
        this.idempotency.set(key, record);
    }
    /** Test helper */
    clear() {
        this.wallets.clear();
        this.ledger = [];
        this.nextSeq = 1;
        this.idempotency.clear();
    }
}
export function newLedgerEntryId() {
    return `le_${randomUUID()}`;
}
//# sourceMappingURL=repository.js.map