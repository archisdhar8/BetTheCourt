import type { LedgerEntry } from "./model.js";
export type WalletProjection = {
    availableMinor: number;
    lockedMinor: number;
    lockedByChallengeMinor: Record<string, number>;
};
export declare function emptyProjection(): WalletProjection;
/** Deterministic fold: apply ledger rows in `sequence` order for one wallet. */
export declare function projectWalletFromLedger(userId: string, entries: LedgerEntry[]): WalletProjection;
/** Build ledger rows for a stake lock (single wallet). */
export declare function buildEscrowLockEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    challengeId: string;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
export declare function buildEscrowRefundEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    challengeId: string;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
export declare function buildEscrowPayoutReleaseEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    challengeId: string;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
export declare function buildEscrowPayoutCreditEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    challengeId: string;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
export declare function buildCreditEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    correlationId: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}): LedgerEntry;
export declare function buildDebitAvailableEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
export declare function buildPlatformFeeCreditEntry(input: {
    id: string;
    sequence: number;
    at: string;
    walletUserId: string;
    currency: string;
    amountMinor: number;
    challengeId: string;
    correlationId: string;
    idempotencyKey: string;
}): LedgerEntry;
//# sourceMappingURL=ledger.d.ts.map