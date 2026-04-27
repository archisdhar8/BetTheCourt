import { randomUUID } from "node:crypto";
import { ChallengeDomainError, bothSidesFundsLocked, canInitiatePayout, canRecordRanking, isTerminalState, } from "./model.js";
import { applyTransition, assertNotTerminal, assertTransition, findTransitionRule, } from "./stateMachine.js";
export class ChallengeService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async load(id) {
        const ch = await this.repo.getById(id);
        if (!ch) {
            throw new ChallengeDomainError({ code: "not_found", message: `Challenge ${id} not found`, httpStatus: 404 });
        }
        return ch;
    }
    async persist(ch) {
        await this.repo.save(ch);
    }
    async createChallenge(input) {
        if (input.creatorPartyId === input.opponentPartyId) {
            throw new ChallengeDomainError({
                code: "invalid_payload",
                message: "creatorPartyId and opponentPartyId must differ",
                httpStatus: 400,
            });
        }
        const now = new Date().toISOString();
        const id = `ch_${randomUUID()}`;
        const challenge = {
            id,
            sport: input.sport,
            mode: input.mode,
            creatorPartyId: input.creatorPartyId,
            opponentPartyId: input.opponentPartyId,
            stakeMinor: input.stakeMinor,
            currency: input.currency,
            state: "draft",
            creatorFundsLocked: false,
            opponentFundsLocked: false,
            createdAt: now,
            updatedAt: now,
            transitions: [],
        };
        await this.repo.create(challenge);
        if (input.initialState !== "draft") {
            await this.submitDraft(challenge.id, { kind: "party", partyId: input.creatorPartyId });
            return (await this.repo.getById(id));
        }
        return challenge;
    }
    async getChallenge(id) {
        return this.load(id);
    }
    async submitDraft(id, actor) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const rule = assertTransition(ch, "submit", actor);
        applyTransition(ch, rule, actor, { action: "submit" });
        await this.persist(ch);
        return ch;
    }
    async accept(id, actor) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const rule = assertTransition(ch, "accept", actor);
        applyTransition(ch, rule, actor, { action: "accept" });
        await this.persist(ch);
        return ch;
    }
    async decline(id, actor) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const rule = assertTransition(ch, "decline", actor);
        applyTransition(ch, rule, actor, { action: "decline" });
        await this.persist(ch);
        return ch;
    }
    async cancel(id, actor, reason) {
        const ch = await this.load(id);
        if (isTerminalState(ch.state))
            return ch;
        const rule = assertTransition(ch, "cancel", actor);
        applyTransition(ch, rule, actor, { action: "cancel", reason });
        await this.persist(ch);
        return ch;
    }
    async patchVenue(id, actor, venueId) {
        const ch = await this.load(id);
        if (isTerminalState(ch.state)) {
            throw new ChallengeDomainError({
                code: "invalid_transition",
                message: "Cannot change venue in terminal state",
                httpStatus: 409,
            });
        }
        const allowed = ["draft", "pending", "accepted", "funded"];
        if (!allowed.includes(ch.state)) {
            throw new ChallengeDomainError({
                code: "invalid_transition",
                message: `Venue cannot be changed in state '${ch.state}'`,
                httpStatus: 409,
            });
        }
        const role = actor.kind === "party" ? (actor.partyId === ch.creatorPartyId ? "creator" : actor.partyId === ch.opponentPartyId ? "opponent" : null) : null;
        if (actor.kind === "admin") {
            ch.venueId = venueId;
            ch.updatedAt = new Date().toISOString();
            await this.persist(ch);
            return ch;
        }
        if (role === null) {
            throw new ChallengeDomainError({ code: "forbidden_actor", message: "Actor not on challenge", httpStatus: 403 });
        }
        ch.venueId = venueId;
        ch.updatedAt = new Date().toISOString();
        await this.persist(ch);
        return ch;
    }
    async proposeSchedule(id, actor, proposal) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        if (ch.state === "accepted" || ch.state === "funded") {
            const role = actor.kind === "party" ? (actor.partyId === ch.creatorPartyId || actor.partyId === ch.opponentPartyId ? "ok" : null) : actor.kind === "admin" ? "ok" : null;
            if (role === null) {
                throw new ChallengeDomainError({ code: "forbidden_actor", message: "Actor not allowed", httpStatus: 403 });
            }
            ch.scheduleProposal = proposal;
            ch.scheduleConfirmations = [];
            ch.updatedAt = new Date().toISOString();
            await this.persist(ch);
            return ch;
        }
        throw new ChallengeDomainError({
            code: "invalid_transition",
            message: `schedule/propose is only valid from accepted or funded (got ${ch.state})`,
            httpStatus: 409,
        });
    }
    /**
     * Internal: called by `SchedulingService` once both parties confirmed the same slot.
     * Applies `funded → scheduled` with system actor (`confirm_schedule_agent`).
     */
    async applyAgentScheduleConfirmation(id, proposal, metadata) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        if (ch.state !== "funded") {
            throw new ChallengeDomainError({
                code: "invalid_transition",
                message: "Schedule can only be finalized while funded",
                httpStatus: 409,
            });
        }
        if (!ch.venueId) {
            throw new ChallengeDomainError({
                code: "invalid_payload",
                message: "Venue is required before schedule can be finalized",
                httpStatus: 409,
            });
        }
        const actor = { kind: "system" };
        ch.scheduleProposal = proposal;
        ch.scheduleConfirmations = [ch.creatorPartyId, ch.opponentPartyId];
        const rule = assertTransition(ch, "confirm_schedule_agent", actor);
        applyTransition(ch, rule, actor, { action: "confirm_schedule_agent", metadata });
        await this.persist(ch);
        return ch;
    }
    async completeMatch(id, actor, result) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const rule = assertTransition(ch, "complete_match", actor);
        if (actor.kind !== "party") {
            throw new ChallengeDomainError({ code: "forbidden_actor", message: "Only parties may complete", httpStatus: 403 });
        }
        applyTransition(ch, rule, actor, { action: "complete_match", metadata: { resultKeys: Object.keys(result) } });
        ch.result = result;
        ch.completedByPartyId = actor.partyId;
        await this.persist(ch);
        return ch;
    }
    async confirmResult(id, actor, note) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        if (ch.state !== "completed") {
            throw new ChallengeDomainError({
                code: "invalid_transition",
                message: "confirm-result only from completed",
                httpStatus: 409,
            });
        }
        if (actor.kind !== "party") {
            throw new ChallengeDomainError({ code: "forbidden_actor", message: "Only parties may confirm", httpStatus: 403 });
        }
        if (actor.partyId === ch.completedByPartyId) {
            throw new ChallengeDomainError({
                code: "forbidden_actor",
                message: "Submitting party cannot confirm its own result (MVP anti-collusion guard)",
                httpStatus: 403,
            });
        }
        if (actor.partyId !== ch.creatorPartyId && actor.partyId !== ch.opponentPartyId) {
            throw new ChallengeDomainError({ code: "forbidden_actor", message: "Actor not on challenge", httpStatus: 403 });
        }
        const rule = assertTransition(ch, "confirm_result", actor);
        applyTransition(ch, rule, actor, { action: "confirm_result", reason: note });
        await this.persist(ch);
        return ch;
    }
    async dispute(id, actor, reason) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const rule = assertTransition(ch, "dispute", actor);
        applyTransition(ch, rule, actor, { action: "dispute", reason });
        await this.persist(ch);
        return ch;
    }
    async resolveDispute(id, actor, resolution, note) {
        const ch = await this.load(id);
        assertNotTerminal(ch);
        const action = resolution === "confirm" ? "resolve_dispute_confirmed" : "resolve_dispute_refund";
        const rule = assertTransition(ch, action, actor);
        applyTransition(ch, rule, actor, { action, reason: note });
        await this.persist(ch);
        return ch;
    }
    /**
     * Internal: called only from `WalletService` after ledger escrow lock succeeds.
     * Applies `accepted → funded` via `funds_locked` when both sides’ flags are true (system actor on transition).
     * Not exposed over HTTP — use `POST /v1/challenges/:id/escrow/lock` so funding never drifts from the ledger.
     */
    async recordPartyFundsLocked(id, actor, side) {
        if (actor.kind !== "system") {
            throw new ChallengeDomainError({
                code: "forbidden_actor",
                message: "Only the system actor may record funds locked (wallet)",
                httpStatus: 403,
            });
        }
        const ch = await this.load(id);
        if (ch.state === "funded") {
            return ch;
        }
        if (ch.state !== "accepted") {
            throw new ChallengeDomainError({
                code: "invalid_transition",
                message: `Funds lock only applies while accepted (got ${ch.state})`,
                httpStatus: 409,
            });
        }
        if (side === "creator") {
            ch.creatorFundsLocked = true;
        }
        else {
            ch.opponentFundsLocked = true;
        }
        if (bothSidesFundsLocked(ch)) {
            const rule = assertTransition(ch, "funds_locked", actor);
            applyTransition(ch, rule, actor, {
                action: "funds_locked",
                metadata: { creatorFundsLocked: true, opponentFundsLocked: true },
            });
        }
        ch.updatedAt = new Date().toISOString();
        await this.persist(ch);
        return ch;
    }
    /**
     * Worker / PSP webhook entrypoint. HTTP wrapper: `POST /v1/challenges/:id/payout` (system actor).
     */
    async finalizePayout(id, actor) {
        if (actor.kind !== "system") {
            throw new ChallengeDomainError({
                code: "forbidden_actor",
                message: "Only the system actor may finalize payout",
                httpStatus: 403,
            });
        }
        const ch = await this.load(id);
        if (!canInitiatePayout(ch.state)) {
            throw new ChallengeDomainError({
                code: "payout_blocked",
                message: `Payout blocked in state '${ch.state}' (requires confirmed)`,
                httpStatus: 409,
            });
        }
        const rule = assertTransition(ch, "finalize_payout", actor);
        applyTransition(ch, rule, actor, { action: "finalize_payout" });
        await this.persist(ch);
        return ch;
    }
    /** Used by ranking integration — disputes block until resolved & confirmed/paid. */
    async assertRankingAllowedForChallenge(id) {
        const ch = await this.load(id);
        if (!canRecordRanking(ch.state)) {
            throw new ChallengeDomainError({
                code: "ranking_blocked",
                message: `Ranking blocked in state '${ch.state}'`,
                httpStatus: 409,
            });
        }
    }
}
/** Introspection for clients / admin tools (HTTP-exposed transitions only). */
export function describeAllowedActions(state) {
    const actions = [
        "submit",
        "accept",
        "decline",
        "cancel",
        // Result recording lives under `POST /v1/challenges/:id/results/*` (see `docs/result-verification-agent.md`).
        "resolve_dispute_confirmed",
        "resolve_dispute_refund",
        "finalize_payout",
    ];
    return actions.filter((a) => findTransitionRule(state, a) !== undefined);
}
//# sourceMappingURL=service.js.map