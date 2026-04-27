import { buildNoShowRiskPlaceholder, CheckinDomainError, distanceToVenueMeters, isWithinTimeWindow, mergeCheckinPolicy, } from "./model.js";
function emptyBundle(challengeId) {
    return { challengeId, byPartyId: {} };
}
function ensureParty(challenge, actor) {
    if (actor.kind !== "party") {
        throw new CheckinDomainError({ code: "forbidden_actor", message: "Only party actors may check in", httpStatus: 403 });
    }
    const pid = actor.partyId;
    if (pid !== challenge.creatorPartyId && pid !== challenge.opponentPartyId) {
        throw new CheckinDomainError({ code: "forbidden_actor", message: "Actor is not a participant on this challenge", httpStatus: 403 });
    }
    return pid;
}
export class CheckinService {
    repo;
    challenges;
    venues;
    policy;
    clock;
    constructor(repo, challenges, venues, policyOverrides, clock) {
        this.repo = repo;
        this.challenges = challenges;
        this.venues = venues;
        this.policy = mergeCheckinPolicy(policyOverrides);
        this.clock = clock ?? (() => Date.now());
    }
    /** For `ResultsService` / payout confidence: both participants have a **valid** check-in on file. */
    async bothPartiesHaveValidCheckin(challengeId) {
        const ch = await this.challenges.getChallenge(challengeId);
        const bundle = await this.repo.loadBundle(challengeId);
        if (!bundle)
            return false;
        return (bundle.byPartyId[ch.creatorPartyId]?.valid === true && bundle.byPartyId[ch.opponentPartyId]?.valid === true);
    }
    async partyHasValidCheckin(challengeId, partyId) {
        const bundle = await this.repo.loadBundle(challengeId);
        return bundle?.byPartyId[partyId]?.valid === true;
    }
    async getCheckInStatus(challengeId) {
        const ch = await this.challenges.getChallenge(challengeId);
        const bundle = (await this.repo.loadBundle(challengeId)) ?? emptyBundle(challengeId);
        const nowMs = this.clock();
        const start = ch.scheduleProposal?.startAt;
        return {
            challengeId,
            challengeState: ch.state,
            venueId: ch.venueId,
            scheduledStartAt: start,
            policy: this.policy,
            creatorPartyId: ch.creatorPartyId,
            opponentPartyId: ch.opponentPartyId,
            creator: bundle.byPartyId[ch.creatorPartyId] ?? null,
            opponent: bundle.byPartyId[ch.opponentPartyId] ?? null,
            bothCheckedInValid: bundle.byPartyId[ch.creatorPartyId]?.valid === true && bundle.byPartyId[ch.opponentPartyId]?.valid === true,
            noShowRisk: buildNoShowRiskPlaceholder(ch, bundle, nowMs, start),
        };
    }
    async submitCheckIn(input) {
        const ch = await this.challenges.getChallenge(input.challengeId);
        if (ch.state !== "scheduled") {
            throw new CheckinDomainError({
                code: "challenge_not_scheduled",
                message: `Check-in only allowed while challenge is scheduled (got ${ch.state})`,
                httpStatus: 409,
            });
        }
        if (!ch.venueId) {
            throw new CheckinDomainError({
                code: "missing_venue",
                message: "Challenge has no venue selected",
                httpStatus: 409,
            });
        }
        const startAt = ch.scheduleProposal?.startAt;
        if (!startAt) {
            throw new CheckinDomainError({
                code: "missing_schedule",
                message: "Challenge has no scheduled start time",
                httpStatus: 409,
            });
        }
        const venue = this.venues.getLocation(ch.venueId);
        if (!venue) {
            throw new CheckinDomainError({
                code: "venue_location_unknown",
                message: `No coordinates registered for venue '${ch.venueId}'`,
                httpStatus: 409,
            });
        }
        const partyId = ensureParty(ch, input.actor);
        const nowMs = this.clock();
        const coords = { lat: input.lat, lng: input.lng };
        const distanceMeters = distanceToVenueMeters(coords, venue);
        const timeOk = isWithinTimeWindow({ nowMs, startAtIso: startAt, policy: this.policy });
        const radiusOk = distanceMeters <= this.policy.maxDistanceMeters;
        const invalidReasons = [];
        if (!timeOk)
            invalidReasons.push("outside_time_window");
        if (!radiusOk)
            invalidReasons.push("outside_radius");
        const valid = invalidReasons.length === 0;
        let bundle = (await this.repo.loadBundle(input.challengeId)) ?? emptyBundle(input.challengeId);
        const prior = bundle.byPartyId[partyId];
        if (prior?.valid === true && !this.policy.allowRecheckin) {
            throw new CheckinDomainError({
                code: "duplicate_checkin",
                message: "Party already has a valid check-in (re-check-in disabled)",
                httpStatus: 409,
            });
        }
        const record = {
            partyId,
            submittedAt: new Date(nowMs).toISOString(),
            coordinates: coords,
            distanceToVenueMeters: Math.round(distanceMeters * 1000) / 1000,
            valid,
            invalidReasons,
        };
        bundle = { ...bundle, byPartyId: { ...bundle.byPartyId, [partyId]: record } };
        await this.repo.saveBundle(bundle);
        return this.getCheckInStatus(input.challengeId);
    }
}
//# sourceMappingURL=service.js.map