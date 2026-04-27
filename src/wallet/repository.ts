import { randomUUID } from "node:crypto";
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

export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, WalletProfile>();
  private ledger: LedgerEntry[] = [];
  private nextSeq = 1;
  private readonly idempotency = new Map<string, IdempotencyRecord>();

  async createWallet(wallet: WalletProfile): Promise<void> {
    if (this.wallets.has(wallet.userId)) {
      throw new Error(`Wallet already exists: ${wallet.userId}`);
    }
    this.wallets.set(wallet.userId, wallet);
  }

  async getWallet(userId: string): Promise<WalletProfile | null> {
    return this.wallets.get(userId) ?? null;
  }

  async listLedgerForWallet(userId: string): Promise<LedgerEntry[]> {
    return this.ledger.filter((e) => e.walletUserId === userId);
  }

  async listAllLedger(): Promise<LedgerEntry[]> {
    return [...this.ledger];
  }

  async appendEntries(entries: LedgerEntry[]): Promise<void> {
    for (const e of entries) {
      this.ledger.push(e);
    }
    this.ledger.sort((a, b) => a.sequence - b.sequence);
  }

  async removeEntriesByCorrelationId(correlationId: string): Promise<void> {
    this.ledger = this.ledger.filter((e) => e.correlationId !== correlationId);
  }

  async allocateSequences(count: number): Promise<number> {
    const start = this.nextSeq;
    if (count > 0) {
      this.nextSeq += count;
    }
    return start;
  }

  async getIdempotency(key: string): Promise<IdempotencyRecord | null> {
    return this.idempotency.get(key) ?? null;
  }

  async putIdempotency(key: string, record: IdempotencyRecord): Promise<void> {
    this.idempotency.set(key, record);
  }

  /** Test helper */
  clear(): void {
    this.wallets.clear();
    this.ledger = [];
    this.nextSeq = 1;
    this.idempotency.clear();
  }
}

export function newLedgerEntryId(): string {
  return `le_${randomUUID()}`;
}
