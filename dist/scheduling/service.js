import { randomUUID } from "node:crypto";
import { SchedulingDomainError, } from "./model.js";
function addMinutesIso(iso, minutes) {
    return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}
function assertIsoOrder(startAt, endAt) {
    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
        throw new SchedulingDomainError({
            code: "invalid_payload",
            message: "Each slot requires startAt < endAt",
            httpStatus: 400,
        });
    }
}
/** Great-circle distance in km (deterministic; optional travel awareness). */
export function haversineKm(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function buildSlotsFromInput(input) {
    const buf = input.travelBufferMinutes ?? 0;
    return input.slots.map((s) => {
        assertIsoOrder(s.startAt, s.endAt);
        const effectiveEndAt = addMinutesIso(s.endAt, buf);
        let estimatedMaxTravelKm;
        if (input.venue && input.creatorLocation && input.opponentLocation) {
            estimatedMaxTravelKm = Math.max(haversineKm(input.venue, input.creatorLocation), haversineKm(input.venue, input.opponentLocation));
        }
        return {
            id: s.id ?? `slot_${randomUUID()}`,
            startAt: s.startAt,
            endAt: s.endAt,
            note: s.note,
            effectiveEndAt,
            meta: buf || estimatedMaxTravelKm !== undefined
                ? { travelBufferMinutes: buf || undefined, estimatedMaxTravelKm }
                : undefined,
        };
    });
}
function ensurePartyOnChallenge(challenge, actor) {
    if (actor.kind !== "party") {
        throw new SchedulingDomainError({
            code: "forbidden_actor",
            message: "Only party actors may perform this action",
            httpStatus: 403,
        });
    }
    const pid = actor.partyId;
    if (pid !== challenge.creatorPartyId && pid !== challenge.opponentPartyId) {
        throw new SchedulingDomainError({ code: "forbidden_actor", message: "Actor is not on this challenge", httpStatus: 403 });
    }
    return pid;
}
const BLOCKED_SCHEDULE_STATES = [
    "scheduled",
    "completed",
    "confirmed",
    "disputed",
    "paid_out",
    "refunded",
    "cancelled",
];
function assertChallengeSchedulable(ch) {
    if (BLOCKED_SCHEDULE_STATES.includes(ch.state)) {
        throw new SchedulingDomainError({
            code: "already_scheduled",
            message: `Challenge may not change schedule in state '${ch.state}'`,
            httpStatus: 409,
        });
    }
    if (ch.state !== "accepted" && ch.state !== "funded") {
        throw new SchedulingDomainError({
            code: "challenge_not_schedulable",
            message: `Scheduling is only allowed in accepted or funded state (got ${ch.state})`,
            httpStatus: 409,
        });
    }
}
export class SchedulingService {
    repo;
    challenges;
    constructor(repo, challenges) {
        this.repo = repo;
        this.challenges = challenges;
    }
    async getScheduleView(challengeId) {
        const ch = await this.challenges.getChallenge(challengeId);
        const session = (await this.repo.loadSession(challengeId)) ?? emptySession(challengeId);
        const active = session.activePendingProposalId
            ? session.proposals.find((p) => p.id === session.activePendingProposalId)
            : undefined;
        return {
            challengeId,
            challengeState: ch.state,
            venueId: ch.venueId,
            fundingReady: ch.state === "funded",
            proposals: [...session.proposals].sort((a, b) => b.version - a.version),
            activePendingProposal: active,
            confirmedSlot: session.confirmedSlot,
        };
    }
    async proposeSlots(input) {
        const ch = await this.challenges.getChallenge(input.challengeId);
        assertChallengeSchedulable(ch);
        const partyId = ensurePartyOnChallenge(ch, input.actor);
        if (input.slots.length === 0) {
            throw new SchedulingDomainError({ code: "invalid_payload", message: "At least one slot is required", httpStatus: 400 });
        }
        const slots = buildSlotsFromInput({
            slots: input.slots,
            travelBufferMinutes: input.travelBufferMinutes,
            venue: input.venue,
            creatorLocation: input.creatorLocation,
            opponentLocation: input.opponentLocation,
        });
        const now = new Date().toISOString();
        if (new Date(input.expiresAt).getTime() <= new Date(now).getTime()) {
            throw new SchedulingDomainError({
                code: "invalid_payload",
                message: "expiresAt must be in the future",
                httpStatus: 400,
            });
        }
        let session = (await this.repo.loadSession(input.challengeId)) ?? emptySession(input.challengeId);
        if (session.activePendingProposalId) {
            const prev = session.proposals.find((p) => p.id === session.activePendingProposalId);
            if (prev && prev.status === "pending") {
                prev.status = "superseded";
            }
        }
        const version = session.proposals.length === 0 ? 1 : Math.max(...session.proposals.map((p) => p.version)) + 1;
        const rec = {
            id: `spr_${randomUUID()}`,
            challengeId: input.challengeId,
            version,
            proposedByPartyId: partyId,
            slots,
            status: "pending",
            expiresAt: input.expiresAt,
            createdAt: now,
            confirmations: {},
        };
        session.proposals.push(rec);
        session.activePendingProposalId = rec.id;
        await this.repo.saveSession(session);
        const primary = toChallengeProposal(slots[0]);
        await this.challenges.proposeSchedule(input.challengeId, input.actor, primary);
        return this.getScheduleView(input.challengeId);
    }
    /** Counter-propose uses the same payload shape as `proposeSlots`. */
    async counterProposeSlots(input) {
        return this.proposeSlots(input);
    }
    async confirmSlot(input) {
        const ch = await this.challenges.getChallenge(input.challengeId);
        if (ch.state !== "funded") {
            throw new SchedulingDomainError({
                code: "funding_required",
                message: "Final schedule confirmation requires the challenge to be funded",
                httpStatus: 409,
            });
        }
        if (!ch.venueId) {
            throw new SchedulingDomainError({
                code: "venue_required",
                message: "Select a venue before confirming the schedule",
                httpStatus: 409,
            });
        }
        const partyId = ensurePartyOnChallenge(ch, input.actor);
        const session = await this.requireSession(input.challengeId);
        const activeId = session.activePendingProposalId;
        if (!activeId) {
            throw new SchedulingDomainError({
                code: "proposal_not_pending",
                message: "No pending schedule proposal",
                httpStatus: 409,
            });
        }
        const proposal = session.proposals.find((p) => p.id === activeId);
        if (!proposal || proposal.status !== "pending") {
            throw new SchedulingDomainError({ code: "proposal_not_pending", message: "No pending proposal", httpStatus: 409 });
        }
        if (new Date(proposal.expiresAt).getTime() <= Date.now()) {
            throw new SchedulingDomainError({ code: "proposal_expired", message: "Proposal has expired", httpStatus: 409 });
        }
        const slot = proposal.slots.find((s) => s.id === input.slotId);
        if (!slot) {
            throw new SchedulingDomainError({ code: "slot_unknown", message: "Unknown slot id", httpStatus: 400 });
        }
        const existingMine = proposal.confirmations[partyId];
        if (existingMine === input.slotId) {
            return this.getScheduleView(input.challengeId);
        }
        if (existingMine && existingMine !== input.slotId) {
            throw new SchedulingDomainError({
                code: "invalid_payload",
                message: "Party already confirmed a different slot for this proposal",
                httpStatus: 409,
            });
        }
        for (const [pid, sid] of Object.entries(proposal.confirmations)) {
            if (pid === partyId || !sid)
                continue;
            if (sid !== input.slotId) {
                throw new SchedulingDomainError({
                    code: "slot_mismatch",
                    message: "The other party already selected a different slot; confirm the same slot id",
                    httpStatus: 409,
                    details: { otherPartyId: pid, otherSlotId: sid },
                });
            }
        }
        proposal.confirmations[partyId] = input.slotId;
        const cSlot = proposal.confirmations[ch.creatorPartyId];
        const oSlot = proposal.confirmations[ch.opponentPartyId];
        if (cSlot && oSlot && cSlot === oSlot) {
            const chosen = proposal.slots.find((s) => s.id === cSlot);
            proposal.status = "confirmed";
            session.activePendingProposalId = undefined;
            session.confirmedSlot = chosen;
            await this.repo.saveSession(session);
            const scheduleProposal = toChallengeProposal(chosen);
            await this.challenges.applyAgentScheduleConfirmation(input.challengeId, scheduleProposal, {
                proposalId: proposal.id,
                slotId: chosen.id,
            });
            return this.getScheduleView(input.challengeId);
        }
        await this.repo.saveSession(session);
        return this.getScheduleView(input.challengeId);
    }
    async cancelPendingProposal(input) {
        const ch = await this.challenges.getChallenge(input.challengeId);
        assertChallengeSchedulable(ch);
        ensurePartyOnChallenge(ch, input.actor);
        const session = await this.repo.loadSession(input.challengeId);
        if (!session?.activePendingProposalId) {
            return this.getScheduleView(input.challengeId);
        }
        const activeId = session.activePendingProposalId;
        const proposal = session.proposals.find((p) => p.id === activeId);
        if (!proposal || proposal.status !== "pending") {
            return this.getScheduleView(input.challengeId);
        }
        proposal.status = "cancelled";
        session.activePendingProposalId = undefined;
        await this.repo.saveSession(session);
        return this.getScheduleView(input.challengeId);
    }
    /**
     * Marks pending proposals expired when `expiresAt` is before `asOf` (defaults to now).
     * Intended for cron / system calls; exposed as HTTP for MVP.
     */
    async expireStaleProposals(input) {
        const asOf = input.asOf ?? new Date().toISOString();
        const session = (await this.repo.loadSession(input.challengeId)) ?? emptySession(input.challengeId);
        let changed = false;
        for (const p of session.proposals) {
            if (p.status === "pending" && new Date(p.expiresAt).getTime() <= new Date(asOf).getTime()) {
                p.status = "expired";
                if (session.activePendingProposalId === p.id) {
                    session.activePendingProposalId = undefined;
                }
                changed = true;
            }
        }
        if (changed) {
            await this.repo.saveSession(session);
        }
        return this.getScheduleView(input.challengeId);
    }
    async requireSession(challengeId) {
        const s = await this.repo.loadSession(challengeId);
        if (!s) {
            throw new SchedulingDomainError({ code: "not_found", message: "No schedule session for challenge", httpStatus: 404 });
        }
        return s;
    }
}
function emptySession(challengeId) {
    return { challengeId, proposals: [] };
}
function toChallengeProposal(slot) {
    return {
        startAt: slot.startAt,
        endAt: slot.endAt,
        note: slot.note,
    };
}
//# sourceMappingURL=service.js.map