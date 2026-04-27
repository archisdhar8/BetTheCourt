import { randomUUID } from "node:crypto";
import { FraudDomainError } from "../fraud/model.js";
import { canInitiatePayout } from "../challenges/model.js";
import { buildCreditEntry, buildDebitAvailableEntry, buildEscrowLockEntry, buildEscrowPayoutCreditEntry, buildEscrowPayoutReleaseEntry, buildEscrowRefundEntry, buildPlatformFeeCreditEntry, projectWalletFromLedger, } from "./ledger.js";
import { PLATFORM_WALLET_USER_ID, WalletDomainError } from "./model.js";
import { newLedgerEntryId } from "./repository.js";
const CMD_CREDIT = "wallet.credit";
const CMD_DEBIT = "wallet.debit";
const CMD_LOCK = "challenge.escrow.lock";
const CMD_REFUND = "challenge.escrow.refund";
const CMD_PAYOUT = "challenge.escrow.payout";
export class WalletService {
    repo;
    challenges;
    fraud;
    constructor(repo, challenges, fraud) {
        this.repo = repo;
        this.challenges = challenges;
        this.fraud = fraud;
    }
    async createWallet(input) {
        const existing = await this.repo.getWallet(input.userId);
        if (existing) {
            throw new WalletDomainError({
                code: "invalid_payload",
                message: `Wallet already exists for userId '${input.userId}'`,
                httpStatus: 409,
            });
        }
        const now = new Date().toISOString();
        const w = { userId: input.userId, currency: input.currency, createdAt: now };
        await this.repo.createWallet(w);
        return w;
    }
    async getWalletBalances(userId) {
        const w = await this.repo.getWallet(userId);
        if (!w) {
            throw new WalletDomainError({ code: "not_found", message: `Wallet not found for ${userId}`, httpStatus: 404 });
        }
        const entries = await this.repo.listLedgerForWallet(userId);
        const p = projectWalletFromLedger(userId, entries);
        return {
            userId,
            currency: w.currency,
            availableMinor: p.availableMinor,
            lockedMinor: p.lockedMinor,
            lockedByChallengeMinor: { ...p.lockedByChallengeMinor },
        };
    }
    async creditWallet(input) {
        const replay = await this.replayIdempotency(input.idempotencyKey, CMD_CREDIT);
        if (replay)
            return replay;
        const w = await this.requireWallet(input.userId);
        this.assertCurrency(w.currency, input.currency);
        if (input.amountMinor <= 0) {
            throw new WalletDomainError({ code: "invalid_payload", message: "amountMinor must be positive", httpStatus: 400 });
        }
        const correlationId = randomUUID();
        const seq = await this.repo.allocateSequences(1);
        const now = new Date().toISOString();
        const entry = buildCreditEntry({
            id: newLedgerEntryId(),
            sequence: seq,
            at: now,
            walletUserId: input.userId,
            currency: w.currency,
            amountMinor: input.amountMinor,
            correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
        await this.repo.appendEntries([entry]);
        const result = {
            wallet: await this.getWalletBalances(input.userId),
            ledgerEntryIds: [entry.id],
        };
        await this.repo.putIdempotency(input.idempotencyKey, { command: CMD_CREDIT, correlationId, result });
        return result;
    }
    async debitWallet(input) {
        const replay = await this.replayIdempotency(input.idempotencyKey, CMD_DEBIT);
        if (replay)
            return replay;
        const w = await this.requireWallet(input.userId);
        this.assertCurrency(w.currency, input.currency);
        if (input.amountMinor <= 0) {
            throw new WalletDomainError({ code: "invalid_payload", message: "amountMinor must be positive", httpStatus: 400 });
        }
        const proj = projectWalletFromLedger(input.userId, await this.repo.listLedgerForWallet(input.userId));
        if (proj.availableMinor < input.amountMinor) {
            throw new WalletDomainError({
                code: "insufficient_funds",
                message: "Insufficient available balance",
                httpStatus: 409,
                details: { availableMinor: proj.availableMinor, requestedMinor: input.amountMinor },
            });
        }
        const correlationId = randomUUID();
        const seq = await this.repo.allocateSequences(1);
        const now = new Date().toISOString();
        const entry = buildDebitAvailableEntry({
            id: newLedgerEntryId(),
            sequence: seq,
            at: now,
            walletUserId: input.userId,
            currency: w.currency,
            amountMinor: input.amountMinor,
            correlationId,
            idempotencyKey: input.idempotencyKey,
        });
        await this.repo.appendEntries([entry]);
        const result = {
            wallet: await this.getWalletBalances(input.userId),
            ledgerEntryIds: [entry.id],
        };
        await this.repo.putIdempotency(input.idempotencyKey, { command: CMD_DEBIT, correlationId, result });
        return result;
    }
    /**
     * Lock one participant's stake into challenge escrow and notify the challenge aggregate.
     * Idempotent per `idempotencyKey`; rejects a second lock for the same user/challenge with a different key.
     */
    async lockChallengeStake(input) {
        const replay = await this.replayIdempotency(input.idempotencyKey, CMD_LOCK);
        if (replay)
            return replay;
        const ch = await this.challenges.getChallenge(input.challengeId);
        if (ch.state !== "accepted") {
            throw new WalletDomainError({
                code: "challenge_not_escrowable",
                message: `Stake lock only allowed while challenge is accepted (got ${ch.state})`,
                httpStatus: 409,
            });
        }
        const side = input.userId === ch.creatorPartyId ? "creator" : input.userId === ch.opponentPartyId ? "opponent" : null;
        if (!side) {
            throw new WalletDomainError({
                code: "forbidden",
                message: "userId is not a participant on this challenge",
                httpStatus: 403,
            });
        }
        const w = await this.requireWallet(input.userId);
        this.assertCurrency(w.currency, ch.currency);
        const prior = projectWalletFromLedger(input.userId, await this.repo.listLedgerForWallet(input.userId));
        const already = prior.lockedByChallengeMinor[input.challengeId] ?? 0;
        if (already >= ch.stakeMinor) {
            throw new WalletDomainError({
                code: "stake_already_locked",
                message: "Stake is already locked for this user and challenge",
                httpStatus: 409,
                details: { challengeId: input.challengeId, userId: input.userId },
            });
        }
        if (already > 0) {
            throw new WalletDomainError({
                code: "invalid_payload",
                message: "Partial escrow state is not supported for MVP",
                httpStatus: 409,
            });
        }
        if (prior.availableMinor < ch.stakeMinor) {
            throw new WalletDomainError({
                code: "insufficient_funds",
                message: "Insufficient available balance to lock stake",
                httpStatus: 409,
                details: { availableMinor: prior.availableMinor, stakeMinor: ch.stakeMinor },
            });
        }
        const correlationId = randomUUID();
        const seq = await this.repo.allocateSequences(1);
        const now = new Date().toISOString();
        const entry = buildEscrowLockEntry({
            id: newLedgerEntryId(),
            sequence: seq,
            at: now,
            walletUserId: input.userId,
            currency: w.currency,
            amountMinor: ch.stakeMinor,
            challengeId: input.challengeId,
            correlationId,
            idempotencyKey: input.idempotencyKey,
        });
        try {
            await this.repo.appendEntries([entry]);
            const updated = await this.challenges.recordPartyFundsLocked(input.challengeId, { kind: "system" }, side);
            const result = {
                wallet: await this.getWalletBalances(input.userId),
                challenge: updated,
                ledgerEntryIds: [entry.id],
            };
            await this.repo.putIdempotency(input.idempotencyKey, { command: CMD_LOCK, correlationId, result });
            return result;
        }
        catch (err) {
            await this.repo.removeEntriesByCorrelationId(correlationId);
            throw err;
        }
    }
    /**
     * Release all locked stake for a challenge back to available balances.
     * Allowed when the challenge is `refunded` or `cancelled`.
     */
    async refundChallengeEscrow(input) {
        const replay = await this.replayIdempotency(input.idempotencyKey, CMD_REFUND);
        if (replay)
            return replay;
        const ch = await this.challenges.getChallenge(input.challengeId);
        if (ch.state !== "refunded" && ch.state !== "cancelled") {
            throw new WalletDomainError({
                code: "challenge_not_escrowable",
                message: `Escrow refund only after challenge is refunded or cancelled (got ${ch.state})`,
                httpStatus: 409,
            });
        }
        const correlationId = randomUUID();
        const entries = [];
        const touched = new Set();
        const now = new Date().toISOString();
        const targets = [];
        for (const userId of [ch.creatorPartyId, ch.opponentPartyId]) {
            const proj = projectWalletFromLedger(userId, await this.repo.listLedgerForWallet(userId));
            const locked = proj.lockedByChallengeMinor[input.challengeId] ?? 0;
            if (locked <= 0)
                continue;
            const w = await this.requireWallet(userId);
            targets.push({ userId, amountMinor: locked, currency: w.currency });
            touched.add(userId);
        }
        let seq = await this.repo.allocateSequences(targets.length);
        for (const t of targets) {
            entries.push(buildEscrowRefundEntry({
                id: newLedgerEntryId(),
                sequence: seq++,
                at: now,
                walletUserId: t.userId,
                currency: t.currency,
                amountMinor: t.amountMinor,
                challengeId: input.challengeId,
                correlationId,
                idempotencyKey: input.idempotencyKey,
            }));
        }
        if (entries.length > 0) {
            await this.repo.appendEntries(entries);
        }
        const wallets = [];
        for (const userId of touched) {
            wallets.push(await this.getWalletBalances(userId));
        }
        const result = {
            wallets,
            ledgerEntryIds: entries.map((e) => e.id),
        };
        await this.repo.putIdempotency(input.idempotencyKey, { command: CMD_REFUND, correlationId, result });
        return result;
    }
    /**
     * Pay out both stakes to the winner (minus optional platform fee credited to the platform wallet).
     * Requires challenge `confirmed` and advances the challenge to `paid_out` via `finalizePayout`.
     */
    async payoutChallengeEscrow(input) {
        const replay = await this.replayIdempotency(input.idempotencyKey, CMD_PAYOUT);
        if (replay)
            return replay;
        const ch = await this.challenges.getChallenge(input.challengeId);
        if (ch.state === "paid_out") {
            throw new WalletDomainError({
                code: "already_paid_out",
                message: "Challenge is already paid out",
                httpStatus: 409,
            });
        }
        if (!canInitiatePayout(ch.state)) {
            throw new WalletDomainError({
                code: "invalid_payout",
                message: `Payout not allowed from state '${ch.state}'`,
                httpStatus: 409,
            });
        }
        if (input.winnerUserId !== ch.creatorPartyId && input.winnerUserId !== ch.opponentPartyId) {
            throw new WalletDomainError({
                code: "invalid_payload",
                message: "winnerUserId must be creator or opponent",
                httpStatus: 400,
            });
        }
        const fee = input.platformFeeMinor ?? 0;
        if (fee < 0 || fee > ch.stakeMinor * 2) {
            throw new WalletDomainError({ code: "invalid_payload", message: "Invalid platformFeeMinor", httpStatus: 400 });
        }
        const loserUserId = input.winnerUserId === ch.creatorPartyId ? ch.opponentPartyId : ch.creatorPartyId;
        const all = await this.repo.listAllLedger();
        const winnerProj = projectWalletFromLedger(input.winnerUserId, all);
        const loserProj = projectWalletFromLedger(loserUserId, all);
        const wStake = winnerProj.lockedByChallengeMinor[input.challengeId] ?? 0;
        const lStake = loserProj.lockedByChallengeMinor[input.challengeId] ?? 0;
        if (wStake !== ch.stakeMinor || lStake !== ch.stakeMinor) {
            throw new WalletDomainError({
                code: "invalid_payout",
                message: "Both participants must have the full stake locked for this challenge",
                httpStatus: 409,
                details: { winnerLockedMinor: wStake, loserLockedMinor: lStake, stakeMinor: ch.stakeMinor },
            });
        }
        const netToWinner = ch.stakeMinor * 2 - fee;
        if (netToWinner < 0) {
            throw new WalletDomainError({ code: "invalid_payload", message: "Fee exceeds total pot", httpStatus: 400 });
        }
        if (this.fraud) {
            try {
                await this.fraud.assertPayoutAllowed(input.challengeId);
            }
            catch (err) {
                if (err instanceof FraudDomainError && err.code === "payout_blocked") {
                    throw new WalletDomainError({
                        code: "fraud_payout_blocked",
                        message: err.message,
                        httpStatus: err.httpStatus,
                        details: err.details,
                    });
                }
                throw err;
            }
        }
        await this.ensurePlatformWallet(ch.currency);
        const correlationId = randomUUID();
        const now = new Date().toISOString();
        const entryCount = fee > 0 ? 4 : 3;
        let cur = await this.repo.allocateSequences(entryCount);
        const entries = [];
        const wWallet = await this.requireWallet(input.winnerUserId);
        const lWallet = await this.requireWallet(loserUserId);
        entries.push(buildEscrowPayoutReleaseEntry({
            id: newLedgerEntryId(),
            sequence: cur++,
            at: now,
            walletUserId: input.winnerUserId,
            currency: wWallet.currency,
            amountMinor: ch.stakeMinor,
            challengeId: input.challengeId,
            correlationId,
            idempotencyKey: input.idempotencyKey,
        }), buildEscrowPayoutReleaseEntry({
            id: newLedgerEntryId(),
            sequence: cur++,
            at: now,
            walletUserId: loserUserId,
            currency: lWallet.currency,
            amountMinor: ch.stakeMinor,
            challengeId: input.challengeId,
            correlationId,
            idempotencyKey: input.idempotencyKey,
        }), buildEscrowPayoutCreditEntry({
            id: newLedgerEntryId(),
            sequence: cur++,
            at: now,
            walletUserId: input.winnerUserId,
            currency: wWallet.currency,
            amountMinor: netToWinner,
            challengeId: input.challengeId,
            correlationId,
            idempotencyKey: input.idempotencyKey,
        }));
        if (fee > 0) {
            entries.push(buildPlatformFeeCreditEntry({
                id: newLedgerEntryId(),
                sequence: cur++,
                at: now,
                walletUserId: PLATFORM_WALLET_USER_ID,
                currency: wWallet.currency,
                amountMinor: fee,
                challengeId: input.challengeId,
                correlationId,
                idempotencyKey: input.idempotencyKey,
            }));
        }
        try {
            await this.repo.appendEntries(entries);
            const updated = await this.challenges.finalizePayout(input.challengeId, { kind: "system" });
            const wallets = [
                await this.getWalletBalances(input.winnerUserId),
                await this.getWalletBalances(loserUserId),
            ];
            if (fee > 0) {
                wallets.push(await this.getWalletBalances(PLATFORM_WALLET_USER_ID));
            }
            const result = {
                wallets,
                ledgerEntryIds: entries.map((e) => e.id),
                challenge: updated,
            };
            await this.repo.putIdempotency(input.idempotencyKey, { command: CMD_PAYOUT, correlationId, result });
            return result;
        }
        catch (err) {
            await this.repo.removeEntriesByCorrelationId(correlationId);
            throw err;
        }
    }
    /** True when both creator and opponent have the full stake locked in the ledger for this challenge. */
    async isChallengeFullyEscrowed(challengeId) {
        const ch = await this.challenges.getChallenge(challengeId);
        const all = await this.repo.listAllLedger();
        const c = projectWalletFromLedger(ch.creatorPartyId, all).lockedByChallengeMinor[challengeId] ?? 0;
        const o = projectWalletFromLedger(ch.opponentPartyId, all).lockedByChallengeMinor[challengeId] ?? 0;
        return c >= ch.stakeMinor && o >= ch.stakeMinor;
    }
    async ensurePlatformWallet(currency) {
        const existing = await this.repo.getWallet(PLATFORM_WALLET_USER_ID);
        if (existing) {
            this.assertCurrency(existing.currency, currency);
            return;
        }
        await this.createWallet({ userId: PLATFORM_WALLET_USER_ID, currency });
    }
    async requireWallet(userId) {
        const w = await this.repo.getWallet(userId);
        if (!w) {
            throw new WalletDomainError({ code: "not_found", message: `Wallet not found for ${userId}`, httpStatus: 404 });
        }
        return w;
    }
    assertCurrency(walletCurrency, opCurrency) {
        if (walletCurrency !== opCurrency) {
            throw new WalletDomainError({
                code: "currency_mismatch",
                message: `Expected currency ${walletCurrency}, got ${opCurrency}`,
                httpStatus: 400,
            });
        }
    }
    async replayIdempotency(key, command) {
        const existing = await this.repo.getIdempotency(key);
        if (!existing)
            return null;
        if (existing.command !== command) {
            throw new WalletDomainError({
                code: "duplicate_idempotency_key",
                message: `Idempotency key already used for ${existing.command}`,
                httpStatus: 409,
                details: { existingCommand: existing.command },
            });
        }
        return existing.result;
    }
}
//# sourceMappingURL=service.js.map