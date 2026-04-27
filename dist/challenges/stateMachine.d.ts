import type { Actor, ActorKind, Challenge, ChallengeState } from "./model.js";
export type TransitionAction = "submit" | "accept" | "decline" | "cancel" | "confirm_schedule_agent" | "complete_match" | "confirm_result" | "dispute" | "resolve_dispute_confirmed" | "resolve_dispute_refund" | "finalize_payout" | "funds_locked";
type TransitionRule = {
    from: ChallengeState;
    to: ChallengeState;
    action: TransitionAction;
    /** Which actor kinds may perform this transition. */
    actors: ActorKind[];
};
export declare function findTransitionRule(from: ChallengeState, action: TransitionAction): TransitionRule | undefined;
export declare function assertActorAllowed(rule: TransitionRule, role: ActorKind | null): void;
export declare function assertTransition(challenge: Challenge, action: TransitionAction, actor: Actor): TransitionRule;
/** Apply transition with history append (mutates challenge). */
export declare function applyTransition(challenge: Challenge, rule: TransitionRule, actor: Actor, input: {
    action: TransitionAction;
    reason?: string;
    metadata?: Record<string, unknown>;
}): void;
export declare function assertNotTerminal(challenge: Challenge): void;
export {};
//# sourceMappingURL=stateMachine.d.ts.map