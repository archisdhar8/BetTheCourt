export function emptyProjection() {
    return { availableMinor: 0, lockedMinor: 0, lockedByChallengeMinor: {} };
}
/** Deterministic fold: apply ledger rows in `sequence` order for one wallet. */
export function projectWalletFromLedger(userId, entries) {
    const sorted = [...entries].filter((e) => e.walletUserId === userId).sort((a, b) => a.sequence - b.sequence);
    return sorted.reduce((acc, row) => applyRow(acc, row), emptyProjection());
}
function applyRow(p, row) {
    const next = {
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
function assertNonNegative(p, entryId) {
    if (p.availableMinor < 0 || p.lockedMinor < 0) {
        throw new Error(`Ledger overdraft after entry ${entryId}: available=${p.availableMinor} locked=${p.lockedMinor}`);
    }
}
/** Build ledger rows for a stake lock (single wallet). */
export function buildEscrowLockEntry(input) {
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
export function buildEscrowRefundEntry(input) {
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
export function buildEscrowPayoutReleaseEntry(input) {
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
export function buildEscrowPayoutCreditEntry(input) {
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
export function buildCreditEntry(input) {
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
export function buildDebitAvailableEntry(input) {
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
export function buildPlatformFeeCreditEntry(input) {
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
//# sourceMappingURL=ledger.js.map