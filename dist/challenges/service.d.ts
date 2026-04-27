import type { Actor, Challenge, ChallengeState, ScheduleProposal } from "./model.js";
import type { ChallengeRepository } from "./repository.js";
import type { TransitionAction } from "./stateMachine.js";
export type CreateChallengeInput = {
    sport: string;
    mode: Challenge["mode"];
    creatorPartyId: string;
    opponentPartyId: string;
    stakeMinor: number;
    currency: string;
    initialState?: "draft" | "pending";
};
export declare class ChallengeService {
    private readonly repo;
    constructor(repo: ChallengeRepository);
    private load;
    private persist;
    createChallenge(input: CreateChallengeInput): Promise<Challenge>;
    getChallenge(id: string): Promise<Challenge>;
    submitDraft(id: string, actor: Actor): Promise<Challenge>;
    accept(id: string, actor: Actor): Promise<Challenge>;
    decline(id: string, actor: Actor): Promise<Challenge>;
    cancel(id: string, actor: Actor, reason?: string): Promise<Challenge>;
    patchVenue(id: string, actor: Actor, venueId: string): Promise<Challenge>;
    proposeSchedule(id: string, actor: Actor, proposal: ScheduleProposal): Promise<Challenge>;
    /**
     * Internal: called by `SchedulingService` once both parties confirmed the same slot.
     * Applies `funded → scheduled` with system actor (`confirm_schedule_agent`).
     */
    applyAgentScheduleConfirmation(id: string, proposal: ScheduleProposal, metadata?: Record<string, unknown>): Promise<Challenge>;
    completeMatch(id: string, actor: Actor, result: Record<string, unknown>): Promise<Challenge>;
    confirmResult(id: string, actor: Actor, note?: string): Promise<Challenge>;
    dispute(id: string, actor: Actor, reason: string): Promise<Challenge>;
    resolveDispute(id: string, actor: Actor, resolution: "confirm" | "refund", note?: string): Promise<Challenge>;
    /**
     * Internal: called only from `WalletService` after ledger escrow lock succeeds.
     * Applies `accepted → funded` via `funds_locked` when both sides’ flags are true (system actor on transition).
     * Not exposed over HTTP — use `POST /v1/challenges/:id/escrow/lock` so funding never drifts from the ledger.
     */
    recordPartyFundsLocked(id: string, actor: Actor, side: "creator" | "opponent"): Promise<Challenge>;
    /**
     * Worker / PSP webhook entrypoint. HTTP wrapper: `POST /v1/challenges/:id/payout` (system actor).
     */
    finalizePayout(id: string, actor: Actor): Promise<Challenge>;
    /** Used by ranking integration — disputes block until resolved & confirmed/paid. */
    assertRankingAllowedForChallenge(id: string): Promise<void>;
}
/** Introspection for clients / admin tools (HTTP-exposed transitions only). */
export declare function describeAllowedActions(state: ChallengeState): TransitionAction[];
//# sourceMappingURL=service.d.ts.map