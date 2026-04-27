import { haversineKm } from "../matchmaking/scoring.js";
export const DEFAULT_CHECKIN_POLICY = {
    windowBeforeStartMinutes: 120,
    windowAfterStartMinutes: 240,
    maxDistanceMeters: 500,
    allowRecheckin: false,
};
export class CheckinDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "CheckinDomainError";
    }
}
export function mergeCheckinPolicy(overrides) {
    return { ...DEFAULT_CHECKIN_POLICY, ...overrides };
}
export function distanceToVenueMeters(user, venue) {
    return haversineKm(user, venue) * 1000;
}
export function isWithinTimeWindow(input) {
    const start = new Date(input.startAtIso).getTime();
    if (Number.isNaN(start))
        return false;
    const open = start - input.policy.windowBeforeStartMinutes * 60_000;
    const close = start + input.policy.windowAfterStartMinutes * 60_000;
    return input.nowMs >= open && input.nowMs <= close;
}
export function buildNoShowRiskPlaceholder(ch, bundle, nowMs, scheduledStartAt) {
    const hints = [];
    const startMs = scheduledStartAt ? new Date(scheduledStartAt).getTime() : NaN;
    const pastStart = !Number.isNaN(startMs) && nowMs > startMs;
    const creatorOk = bundle?.byPartyId[ch.creatorPartyId]?.valid === true;
    const opponentOk = bundle?.byPartyId[ch.opponentPartyId]?.valid === true;
    if (ch.state === "scheduled" && pastStart) {
        if (!creatorOk)
            hints.push("no_valid_checkin_creator_after_start");
        if (!opponentOk)
            hints.push("no_valid_checkin_opponent_after_start");
    }
    return { modelScore: null, hints };
}
//# sourceMappingURL=model.js.map