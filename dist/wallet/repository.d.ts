import type { LedgerEntry, WalletProfile } from "./model.js";
export type IdempotencyRecord = {
    command: string;
    correlationId: string;
    /** Serializable replay payload returned to the client. */
    result: unknown;
};
/**
 * Persistence port: append-only ledger + wallet profiles + idempotency index.
 * Swap for Postgres (wallet row, ledger table with unique(sequence), idempotency_keys unique).
 */
export interface WalletRepository {
    createWallet(wallet: WalletProfile): Promise<void>;
    getWallet(userId: string): Promise<WalletProfile | null>;
    listLedgerForWallet(userId: string): Promise<LedgerEntry[]>;
    /** Full ledger scan (payout correlates multiple wallets). */
    listAllLedger(): Promise<LedgerEntry[]>;
    appendEntries(entries: LedgerEntry[]): Promise<void>;
    allocateSequences(count: number): Promise<number>;
    getIdempotency(key: string): Promise<IdempotencyRecord | null>;
    putIdempotency(key: string, record: IdempotencyRecord): Promise<void>;
    /** Compensating action if a downstream domain step fails after ledger append (in-memory MVP). */
    removeEntriesByCorrelationId(correlationId: string): Promise<void>;
}
export declare class InMemoryWalletRepository implements WalletRepository {
    private readonly wallets;
    private ledger;
    private nextSeq;
    private readonly idempotency;
    createWallet(wallet: WalletProfile): Promise<void>;
    getWallet(userId: string): Promise<WalletProfile | null>;
    listLedgerForWallet(userId: string): Promise<LedgerEntry[]>;
    listAllLedger(): Promise<LedgerEntry[]>;
    appendEntries(entries: LedgerEntry[]): Promise<void>;
    removeEntriesByCorrelationId(correlationId: string): Promise<void>;
    allocateSequences(count: number): Promise<number>;
    getIdempotency(key: string): Promise<IdempotencyRecord | null>;
    putIdempotency(key: string, record: IdempotencyRecord): Promise<void>;
    /** Test helper */
    clear(): void;
}
export declare function newLedgerEntryId(): string;
//# sourceMappingURL=repository.d.ts.map