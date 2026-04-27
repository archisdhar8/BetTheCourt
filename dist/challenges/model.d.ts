/** MVP lifecycle states for a money-backed sports challenge. */
export declare const CHALLENGE_STATES: readonly ["draft", "pending", "accepted", "funded", "scheduled", "completed", "confirmed", "disputed", "paid_out", "refunded", "cancelled"];
export type ChallengeState = (typeof CHALLENGE_STATES)[number];
/** Who initiated an action affecting transitions. */
export type ActorKind = "creator" | "opponent" | "system" | "admin";
export type Actor = {
    kind: "party";
    partyId: string;
} | {
    kind: "system";
} | {
    kind: "admin";
    adminId: string;
};
export type ChallengeMode = "1v1" | "team";
export type ScheduleProposal = {
    startAt: string;
    endAt: string;
    note?: string;
};
export type TransitionRecord = {
    id: string;
    at: string;
    from: ChallengeState;
    to: ChallengeState;
    actor: Actor;
    /** Resolved role for party actors (creator/opponent); undefined for system/admin. */
    role?: ActorKind;
    action: string;
    reason?: string;
    metadata?: Record<string, unknown>;
};
export type Challenge = {
    id: string;
    sport: string;
    mode: ChallengeMode;
    creatorPartyId: string;
    opponentPartyId: string;
    stakeMinor: number;
    currency: string;
    state: ChallengeState;
    /** Wallet / escrow confirmed stake lock for creator (accepted → funded when both sides true). */
    creatorFundsLocked?: boolean;
    /** Wallet / escrow confirmed stake lock for opponent. */
    opponentFundsLocked?: boolean;
    venueId?: string;
    scheduleProposal?: ScheduleProposal;
    /** Party ids that have confirmed the current schedule proposal (MVP: need both). */
    scheduleConfirmations?: string[];
    /** Who recorded completion (result submission). */
    completedByPartyId?: string;
    /** Opaque result payload (scores, format, etc.). */
    result?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    transitions: TransitionRecord[];
};
export type ChallengeErrorCode = "not_found" | "invalid_transition" | "forbidden_actor" | "invalid_payload" | "payout_blocked" | "ranking_blocked";
export declare class ChallengeDomainError extends Error {
    readonly code: ChallengeErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown;
    constructor(input: {
        code: ChallengeErrorCode;
        message: string;
        httpStatus?: number;
        details?: unknown;
    });
}
/** Payout (ledger) must only run from `confirmed` (not `disputed`). */
export declare function canInitiatePayout(state: ChallengeState): boolean;
/** Rankings should not advance while disputed or before confirmation. */
export declare function canRecordRanking(state: ChallengeState): boolean;
export declare function isTerminalState(state: ChallengeState): boolean;
export declare function resolveActorRole(challenge: Challenge, actor: Actor): ActorKind | null;
export declare function bothSidesFundsLocked(challenge: Challenge): boolean;
//# sourceMappingURL=model.d.ts.map