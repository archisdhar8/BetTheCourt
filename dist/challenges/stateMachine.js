import { ChallengeDomainError, resolveActorRole } from "./model.js";
/**
 * Declarative transition table (deterministic). Order is not significant; lookup by (from, action).
 */
const RULES = [
    { from: "draft", to: "pending", action: "submit", actors: ["creator"] },
    { from: "draft", to: "cancelled", action: "cancel", actors: ["creator"] },
    { from: "pending", to: "accepted", action: "accept", actors: ["opponent"] },
    { from: "pending", to: "cancelled", action: "decline", actors: ["opponent"] },
    { from: "pending", to: "cancelled", action: "cancel", actors: ["creator"] },
    /** Emitted only after wallet ledger escrow + internal `recordPartyFundsLocked` (no public challenge HTTP for this action). */
    { from: "accepted", to: "funded", action: "funds_locked", actors: ["system"] },
    { from: "accepted", to: "cancelled", action: "cancel", actors: ["creator"] },
    /** Applied only by `ChallengeService.applyAgentScheduleConfirmation` after wallet + scheduling rules pass. */
    { from: "funded", to: "scheduled", action: "confirm_schedule_agent", actors: ["system"] },
    { from: "funded", to: "refunded", action: "cancel", actors: ["admin"] },
    { from: "scheduled", to: "completed", action: "complete_match", actors: ["creator", "opponent"] },
    { from: "scheduled", to: "refunded", action: "cancel", actors: ["admin"] },
    { from: "completed", to: "confirmed", action: "confirm_result", actors: ["creator", "opponent"] },
    { from: "completed", to: "disputed", action: "dispute", actors: ["creator", "opponent"] },
    { from: "disputed", to: "confirmed", action: "resolve_dispute_confirmed", actors: ["admin"] },
    { from: "disputed", to: "refunded", action: "resolve_dispute_refund", actors: ["admin"] },
    { from: "confirmed", to: "paid_out", action: "finalize_payout", actors: ["system"] },
];
export function findTransitionRule(from, action) {
    return RULES.find((r) => r.from === from && r.action === action);
}
export function assertActorAllowed(rule, role) {
    if (role === null || !rule.actors.includes(role)) {
        throw new ChallengeDomainError({
            code: "forbidden_actor",
            message: `Actor is not allowed to perform action '${rule.action}' from state '${rule.from}'.`,
            httpStatus: 403,
            details: { allowedActors: rule.actors },
        });
    }
}
export function assertTransition(challenge, action, actor) {
    const role = resolveActorRole(challenge, actor);
    if (role === null) {
        throw new ChallengeDomainError({
            code: "forbidden_actor",
            message: "Actor partyId is not part of this challenge.",
            httpStatus: 403,
        });
    }
    const rule = findTransitionRule(challenge.state, action);
    if (!rule) {
        throw new ChallengeDomainError({
            code: "invalid_transition",
            message: `Action '${action}' is not valid from state '${challenge.state}'.`,
            httpStatus: 409,
            details: { state: challenge.state, action },
        });
    }
    assertActorAllowed(rule, role);
    return rule;
}
/** Apply transition with history append (mutates challenge). */
export function applyTransition(challenge, rule, actor, input) {
    const role = resolveActorRole(challenge, actor);
    const now = new Date().toISOString();
    const from = challenge.state;
    challenge.state = rule.to;
    challenge.updatedAt = now;
    challenge.transitions.push({
        id: `tr_${challenge.transitions.length + 1}`,
        at: now,
        from,
        to: rule.to,
        actor,
        role: role ?? undefined,
        action: input.action,
        reason: input.reason,
        metadata: input.metadata,
    });
}
export function assertNotTerminal(challenge) {
    if (challenge.state === "paid_out" || challenge.state === "refunded" || challenge.state === "cancelled") {
        throw new ChallengeDomainError({
            code: "invalid_transition",
            message: `Challenge is terminal in state '${challenge.state}'.`,
            httpStatus: 409,
        });
    }
}
//# sourceMappingURL=stateMachine.js.map