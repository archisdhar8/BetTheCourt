import { clamp01, haversineKm } from "../matchmaking/scoring.js";
export function centroidOf(participants) {
    if (participants.length === 0)
        return { lat: 0, lng: 0 };
    const lat = participants.reduce((s, p) => s + p.location.lat, 0) / participants.length;
    const lng = participants.reduce((s, p) => s + p.location.lng, 0) / participants.length;
    return { lat, lng };
}
export function participantDistances(venue, participants) {
    return participants.map((p) => haversineKm(p.location, venue));
}
export function travelImbalanceKm(distancesKm) {
    if (distancesKm.length === 0)
        return 0;
    return Math.max(...distancesKm) - Math.min(...distancesKm);
}
export function totalTravelKm(distancesKm) {
    return distancesKm.reduce((a, b) => a + b, 0);
}
export function centralityScore(venue, centroid, preferredRadiusKm) {
    if (preferredRadiusKm <= 0)
        return 0;
    const d = haversineKm(venue, centroid);
    return clamp01(1 - d / preferredRadiusKm);
}
/**
 * Fairness from travel balance: penalize large imbalance relative to total travel.
 */
export function travelFairnessScore(totalKm, imbalanceKm) {
    const denom = Math.max(0.75, 0.45 * totalKm + 0.25);
    return clamp01(1 - imbalanceKm / denom);
}
/**
 * Prefer lower total travel when feasible (normalized by loose upper bound).
 */
export function travelEfficiencyScore(totalKm, referenceKm) {
    if (referenceKm <= 0)
        return clamp01(1 / (1 + totalKm));
    return clamp01(1 - totalKm / (2 * referenceKm));
}
export function sportCompatibilityScore(sport, venue) {
    return venue.sports.some((s) => s === sport) ? 1 : 0;
}
export function isVenueFeasible(distancesKm, participants) {
    if (distancesKm.length !== participants.length)
        return false;
    return distancesKm.every((d, i) => d <= participants[i].maxTravelDistanceKm);
}
export function resolveHomeCourt(venue, participants) {
    if (venue.affiliatedPartyId && participants.some((p) => p.partyId === venue.affiliatedPartyId)) {
        return true;
    }
    for (const p of participants) {
        if (p.homeVenueIds?.includes(venue.id))
            return true;
    }
    return false;
}
function priceRank(band) {
    if (!band)
        return 2;
    const order = { free: 0, low: 1, mid: 2, high: 3 };
    return order[band];
}
export function priceMatchScore(sensitivity, venueBand) {
    const rank = priceRank(venueBand);
    if (sensitivity === "free_only")
        return venueBand === "free" ? 1 : 0.15;
    if (sensitivity === "budget")
        return rank <= 1 ? 1 : rank === 2 ? 0.55 : 0.2;
    return 1;
}
export function publicPrivateMatch(pref, isPublic) {
    if (pref === "either")
        return 1;
    if (pref === "public")
        return isPublic ? 1 : 0.2;
    return isPublic ? 0.35 : 1;
}
export function parkingMatchScore(importance, parkingScore) {
    const p = parkingScore ?? 0.45;
    const base = clamp01(p);
    return clamp01((1 - importance) * 1 + importance * base);
}
export function lightingMatchScore(importance, hasLighting) {
    const lit = hasLighting ? 1 : 0.25;
    return clamp01((1 - importance) * 1 + importance * lit);
}
export function indoorOutdoorMatchScore(pref, venue) {
    const inKnown = venue.indoorCapable !== undefined;
    const outKnown = venue.outdoorCapable !== undefined;
    if (!inKnown && !outKnown) {
        if (pref === "either")
            return 1;
        return 0.72;
    }
    const inC = venue.indoorCapable === true;
    const outC = venue.outdoorCapable === true;
    if (pref === "either")
        return 1;
    if (pref === "indoor")
        return inC ? 1 : outC ? 0.28 : 0.52;
    return outC ? 1 : inC ? 0.32 : 0.52;
}
export function venueTypeMatchScore(preferred, venueType) {
    if (preferred.length === 0)
        return 0.75;
    return preferred.includes(venueType) ? 1 : 0.35;
}
export function timeWindowOverlapForNow(window, now) {
    if (!window)
        return 1;
    const wd = now.getUTCDay();
    if (window.weekday !== wd)
        return 0.35;
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (mins >= window.startMinute && mins < window.endMinute)
        return 1;
    return 0.55;
}
/**
 * Merge explicit venue confidence, schedule knowledge, and window overlap.
 * When live availability is missing, still returns a conservative positive score.
 */
export function availabilityConfidenceScore(input) {
    const { venue, prefs, now } = input;
    const scheduleKnown = venue.scheduleKnown ?? false;
    const raw = venue.availabilityConfidence ?? (scheduleKnown ? 0.82 : 0.62);
    const windowFactor = timeWindowOverlapForNow(prefs.timeWindowUtc, now);
    const scheduleFactor = scheduleKnown ? 1 : 0.88;
    return {
        raw,
        scheduleKnown,
        score: clamp01(raw * scheduleFactor * windowFactor),
    };
}
export function preferenceComposite(prefs, venue) {
    const publicMatch = publicPrivateMatch(prefs.publicPrivate, venue.isPublic);
    const priceMatch = priceMatchScore(prefs.priceSensitivity, venue.priceBand);
    const parkingMatch = parkingMatchScore(prefs.parkingImportance, venue.parkingScore);
    const lightingMatch = lightingMatchScore(prefs.lightingImportance, venue.hasLighting);
    const indoorOutdoorMatch = indoorOutdoorMatchScore(prefs.indoorOutdoor, venue);
    const venueTypeMatch = venueTypeMatchScore(prefs.preferredVenueTypes, venue.venueType);
    const score = clamp01(0.18 * publicMatch +
        0.18 * priceMatch +
        0.16 * parkingMatch +
        0.14 * lightingMatch +
        0.18 * indoorOutdoorMatch +
        0.16 * venueTypeMatch);
    return {
        score,
        breakdown: {
            publicMatch,
            priceMatch,
            parkingMatch,
            lightingMatch,
            indoorOutdoorMatch,
            venueTypeMatch,
        },
    };
}
export function estimatedDriveMinutes(distanceKm, speedKmh) {
    if (speedKmh <= 0)
        return 0;
    return (distanceKm / speedKmh) * 60;
}
//# sourceMappingURL=scoring.js.map