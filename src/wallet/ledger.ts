import type { LedgerEntry } from "./model.js";

export type WalletProjection = {
  availableMinor: number;
  lockedMinor: number;
  lockedByChallengeMinor: Record<string, number>;
};

export function emptyProjection(): WalletProjection {
  return { availableMinor: 0, lockedMinor: 0, lockedByChallengeMinor: {} };
}

/** Deterministic fold: apply ledger rows in `sequence` order for one wallet. */
export function projectWalletFromLedger(userId: string, entries: LedgerEntry[]): WalletProjection {
  const sorted = [...entries].filter((e) => e.walletUserId === userId).sort((a, b) => a.sequence - b.sequence);
  return sorted.reduce((acc, row) => applyRow(acc, row), emptyProjection());
}

function applyRow(p: WalletProjection, row: LedgerEntry): WalletProjection {
  const next: WalletProjection = {
    availableMinor: p.availableMinor + row.availableMinorDelta,
    lockedMinor: p.lockedMinor + row.lockedMinorDelta,
    lockedByChallengeMinor: { ...p.lockedByChallengeMinor },
  };
  if (row.challengeId) {
    const prev = next.lockedByChallengeMinor[row.challengeId] ?? 0;
    // Locked bucket per challenge tracks stake still held in escrow for this user.
    const delta = row.lockedMinorDelta;
    next.lockedByChallengeMinor[row.challengeId] = Math.max(0, prev + delta);
    if (next.lockedByChallengeMinor[row.challengeId] === 0) {
      delete next.lockedByChallengeMinor[row.challengeId];
    }
  }
  assertNonNegative(next, row.id);
  return next;
}

function assertNonNegative(p: WalletProjection, entryId: string): void {
  if (p.availableMinor < 0 || p.lockedMinor < 0) {
    throw new Error(`Ledger overdraft after entry ${entryId}: available=${p.availableMinor} locked=${p.lockedMinor}`);
  }
}

/** Build ledger rows for a stake lock (single wallet). */
export function buildEscrowLockEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  challengeId: string;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "escrow_lock",
    availableMinorDelta: -input.amountMinor,
    lockedMinorDelta: input.amountMinor,
    amountMinor: input.amountMinor,
    challengeId: input.challengeId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function buildEscrowRefundEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  challengeId: string;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "escrow_refund",
    availableMinorDelta: input.amountMinor,
    lockedMinorDelta: -input.amountMinor,
    amountMinor: input.amountMinor,
    challengeId: input.challengeId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function buildEscrowPayoutReleaseEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  challengeId: string;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "escrow_payout_release",
    availableMinorDelta: 0,
    lockedMinorDelta: -input.amountMinor,
    amountMinor: input.amountMinor,
    challengeId: input.challengeId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function buildEscrowPayoutCreditEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  challengeId: string;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "escrow_payout_credit",
    availableMinorDelta: input.amountMinor,
    lockedMinorDelta: 0,
    amountMinor: input.amountMinor,
    challengeId: input.challengeId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function buildCreditEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  correlationId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "credit",
    availableMinorDelta: input.amountMinor,
    lockedMinorDelta: 0,
    amountMinor: input.amountMinor,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  };
}

export function buildDebitAvailableEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "debit_available",
    availableMinorDelta: -input.amountMinor,
    lockedMinorDelta: 0,
    amountMinor: input.amountMinor,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function buildPlatformFeeCreditEntry(input: {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  amountMinor: number;
  challengeId: string;
  correlationId: string;
  idempotencyKey: string;
}): LedgerEntry {
  return {
    id: input.id,
    sequence: input.sequence,
    at: input.at,
    walletUserId: input.walletUserId,
    currency: input.currency,
    entryType: "platform_fee_credit",
    availableMinorDelta: input.amountMinor,
    lockedMinorDelta: 0,
    amountMinor: input.amountMinor,
    challengeId: input.challengeId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}
