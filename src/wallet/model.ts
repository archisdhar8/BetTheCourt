/** All monetary amounts are integer minor units (e.g. cents). */
export const PLATFORM_WALLET_USER_ID = "__platform__";

export const LEDGER_ENTRY_TYPES = [
  "credit",
  "debit_available",
  "escrow_lock",
  "escrow_refund",
  "escrow_payout_release",
  "escrow_payout_credit",
  "platform_fee_credit",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export type WalletProfile = {
  userId: string;
  currency: string;
  createdAt: string;
};

/**
 * Immutable ledger line. Every money movement appends one or more rows.
 * Deltas are applied to this `walletUserId`'s balance buckets in sequence order.
 */
export type LedgerEntry = {
  id: string;
  sequence: number;
  at: string;
  walletUserId: string;
  currency: string;
  entryType: LedgerEntryType;
  /** Effect on aggregate available balance for this wallet. */
  availableMinorDelta: number;
  /** Effect on aggregate locked balance for this wallet. */
  lockedMinorDelta: number;
  /** Magnitude for challenge-scoped rows (audit / display). */
  amountMinor: number;
  challengeId?: string;
  correlationId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type WalletBalances = {
  userId: string;
  currency: string;
  availableMinor: number;
  lockedMinor: number;
  /** Locked amount per challenge for this user (derived from ledger). */
  lockedByChallengeMinor: Record<string, number>;
};

export type WalletErrorCode =
  | "not_found"
  | "invalid_payload"
  | "insufficient_funds"
  | "duplicate_idempotency_key"
  | "currency_mismatch"
  | "stake_already_locked"
  | "challenge_not_escrowable"
  | "invalid_payout"
  | "already_paid_out"
  | "forbidden"
  | "fraud_payout_blocked";

export class WalletDomainError extends Error {
  readonly code: WalletErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(input: { code: WalletErrorCode; message: string; httpStatus?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
    this.name = "WalletDomainError";
  }
}
