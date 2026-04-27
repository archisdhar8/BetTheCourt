import type { Challenge } from "../challenges/model.js";
/** MVP deterministic signals; extend for ML overlays later. */
export declare const FRAUD_SIGNAL_IDS: readonly ["repeated_same_pair_matches", "repeated_same_winner_pattern", "no_valid_checkins", "only_one_party_checked_in", "result_without_presence_confidence", "high_dispute_rate", "excessive_refunds_or_cancellations", "suspicious_fast_repeat_matches", "payout_attempt_before_low_risk_clearance", "home_court_bias_pattern"];
export type FraudSignalId = (typeof FRAUD_SIGNAL_IDS)[number];
export type FraudSignal = {
    id: FraudSignalId;
    /** Contribution toward raw score before normalization (0–1 cap). */
    weight: number;
    detail?: string;
};
export type FraudRecommendedAction = "allow" | "flag" | "hold_payout" | "manual_review";
export type FraudEvaluationContext = "standard" | "payout_attempt";
export type FraudErrorCode = "payout_blocked";
export declare class FraudDomainError extends Error {
    readonly code: FraudErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown;
    constructor(input: {
        code: FraudErrorCode;
        message: string;
        httpStatus?: number;
        details?: unknown;
    });
}
export type FraudEvaluationRecord = {
    challengeId: string;
    evaluatedAt: string;
    version: number;
    fraudScore: number;
    signals: FraudSignal[];
    recommendedAction: FraudRecommendedAction;
    explanation: string;
    payoutEligible: boolean;
    context: FraudEvaluationContext;
};
/** Historical row for pair/user heuristics (separate from live aggregates). */
export type ChallengeHistorySnapshot = {
    id: string;
    creatorPartyId: string;
    opponentPartyId: string;
    createdAt: string;
    state: string;
    winnerPartyId?: string;
    /** Counted toward dispute-heavy signal. */
    wasDisputed?: boolean;
    /** Refunded or cancelled terminal. */
    wasRefundOrCancel?: boolean;
};
export type PartyFraudStats = {
    partyId: string;
    disputeCount: number;
    refundOrCancelCount: number;
    confirmedCompletedCount: number;
};
export type RuleEngineInput = {
    challenge: Challenge;
    context: FraudEvaluationContext;
    /** Prior evaluations for this challenge (same session / repo). */
    priorEvaluationCount: number;
    bothPartiesValidCheckin: boolean;
    creatorCheckinValid: boolean;
    opponentCheckinValid: boolean;
    hasAnyCheckinRecord: boolean;
    /** Latest confirmed result round fingerprint / payload presence. */
    hasConfirmedResultPath: boolean;
    pairPriorMatchCount: number;
    pairFastRepeatDetected: boolean;
    sameWinnerStreakLength: number;
    creatorStats: PartyFraudStats;
    opponentStats: PartyFraudStats;
    /** When true, emit zero-weight placeholder for dashboards. */
    emitPlaceholderSignals?: boolean;
};
export declare function samePair(a: string, b: string, c: string, d: string): boolean;
export declare function extractWinnerPartyId(result: Record<string, unknown> | undefined, creatorPartyId: string, opponentPartyId: string): string | undefined;
/** Deterministic rules → raw score in [0,1], signals, action, payout gate. */
export declare function evaluateDeterministicRules(input: RuleEngineInput): {
    fraudScore: number;
    signals: FraudSignal[];
    recommendedAction: FraudRecommendedAction;
    explanation: string;
    payoutEligible: boolean;
};
//# sourceMappingURL=model.d.ts.map