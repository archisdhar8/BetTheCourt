import type { ChallengeService } from "../challenges/service.js";
import type { FraudService } from "../fraud/service.js";
import { type WalletBalances, type WalletProfile } from "./model.js";
import { type WalletRepository } from "./repository.js";
export type CreditWalletResult = {
    wallet: WalletBalances;
    ledgerEntryIds: string[];
};
export type DebitWalletResult = {
    wallet: WalletBalances;
    ledgerEntryIds: string[];
};
export type LockStakeResult = {
    wallet: WalletBalances;
    challenge: Awaited<ReturnType<ChallengeService["getChallenge"]>>;
    ledgerEntryIds: string[];
};
export type RefundEscrowResult = {
    wallets: WalletBalances[];
    ledgerEntryIds: string[];
};
export type PayoutEscrowResult = {
    wallets: WalletBalances[];
    ledgerEntryIds: string[];
    challenge: Awaited<ReturnType<ChallengeService["getChallenge"]>>;
};
export declare class WalletService {
    private readonly repo;
    private readonly challenges;
    private readonly fraud?;
    constructor(repo: WalletRepository, challenges: ChallengeService, fraud?: (FraudService | null) | undefined);
    createWallet(input: {
        userId: string;
        currency: string;
    }): Promise<WalletProfile>;
    getWalletBalances(userId: string): Promise<WalletBalances>;
    creditWallet(input: {
        userId: string;
        amountMinor: number;
        currency: string;
        idempotencyKey: string;
        metadata?: Record<string, unknown>;
    }): Promise<CreditWalletResult>;
    debitWallet(input: {
        userId: string;
        amountMinor: number;
        currency: string;
        idempotencyKey: string;
    }): Promise<DebitWalletResult>;
    /**
     * Lock one participant's stake into challenge escrow and notify the challenge aggregate.
     * Idempotent per `idempotencyKey`; rejects a second lock for the same user/challenge with a different key.
     */
    lockChallengeStake(input: {
        challengeId: string;
        userId: string;
        idempotencyKey: string;
    }): Promise<LockStakeResult>;
    /**
     * Release all locked stake for a challenge back to available balances.
     * Allowed when the challenge is `refunded` or `cancelled`.
     */
    refundChallengeEscrow(input: {
        challengeId: string;
        idempotencyKey: string;
    }): Promise<RefundEscrowResult>;
    /**
     * Pay out both stakes to the winner (minus optional platform fee credited to the platform wallet).
     * Requires challenge `confirmed` and advances the challenge to `paid_out` via `finalizePayout`.
     */
    payoutChallengeEscrow(input: {
        challengeId: string;
        winnerUserId: string;
        platformFeeMinor?: number;
        idempotencyKey: string;
    }): Promise<PayoutEscrowResult>;
    /** True when both creator and opponent have the full stake locked in the ledger for this challenge. */
    isChallengeFullyEscrowed(challengeId: string): Promise<boolean>;
    private ensurePlatformWallet;
    private requireWallet;
    private assertCurrency;
    private replayIdempotency;
}
//# sourceMappingURL=service.d.ts.map