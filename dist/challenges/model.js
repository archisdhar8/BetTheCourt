/** MVP lifecycle states for a money-backed sports challenge. */
export const CHALLENGE_STATES = [
    "draft",
    "pending",
    "accepted",
    "funded",
    "scheduled",
    "completed",
    "confirmed",
    "disputed",
    "paid_out",
    "refunded",
    "cancelled",
];
export class ChallengeDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "ChallengeDomainError";
    }
}
/** Payout (ledger) must only run from `confirmed` (not `disputed`). */
export function canInitiatePayout(state) {
    return state === "confirmed";
}
/** Rankings should not advance while disputed or before confirmation. */
export function canRecordRanking(state) {
    return state === "confirmed" || state === "paid_out";
}
export function isTerminalState(state) {
    return state === "paid_out" || state === "refunded" || state === "cancelled";
}
export function resolveActorRole(challenge, actor) {
    if (actor.kind === "system")
        return "system";
    if (actor.kind === "admin")
        return "admin";
    if (actor.partyId === challenge.creatorPartyId)
        return "creator";
    if (actor.partyId === challenge.opponentPartyId)
        return "opponent";
    return null;
}
export function bothSidesFundsLocked(challenge) {
    return Boolean(challenge.creatorFundsLocked ?? false) && Boolean(challenge.opponentFundsLocked ?? false);
}
//# sourceMappingURL=model.js.map