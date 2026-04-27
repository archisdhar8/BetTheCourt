import { haversineKm } from "../matchmaking/scoring.js";
import { buildDeterministicVenueExplanation } from "./explanations.js";
import { availabilityConfidenceScore, centroidOf, estimatedDriveMinutes, isVenueFeasible, participantDistances, preferenceComposite, resolveHomeCourt, sportCompatibilityScore, totalTravelKm, travelFairnessScore, travelEfficiencyScore, travelImbalanceKm, centralityScore, } from "./scoring.js";
export const DEFAULT_VENUE_DISCOVERY_CONFIG = {
    weights: {
        centrality: 0.18,
        travelFairness: 0.22,
        travelEfficiency: 0.18,
        venueQuality: 0.12,
        preferenceMatch: 0.12,
        sportCompatibility: 0.1,
        availability: 0.08,
    },
    homeCourtSuitabilityMultiplier: 0.9,
    assumedAverageSpeedKmh: 28,
};
function mergeConfig(overrides) {
    return {
        ...DEFAULT_VENUE_DISCOVERY_CONFIG,
        ...overrides,
        weights: { ...DEFAULT_VENUE_DISCOVERY_CONFIG.weights, ...overrides?.weights },
    };
}
function weightedSuitability(parts, weights) {
    const entries = Object.entries(weights);
    const wSum = entries.reduce((s, [, w]) => s + w, 0);
    if (wSum <= 0)
        return 0;
    const sum = entries.reduce((s, [k, w]) => s + w * parts[k], 0);
    return sum / wSum;
}
function baselineTotalTravelKm(centroid, participants) {
    return totalTravelKm(participantDistances(centroid, participants));
}
export async function rankVenues(input) {
    const now = input.now ?? new Date();
    const config = mergeConfig(input.config);
    const centroid = centroidOf(input.participants);
    const baselineTotal = baselineTotalTravelKm(centroid, input.participants);
    const rows = [];
    for (const venue of input.venues) {
        const sportCompat = sportCompatibilityScore(input.sport, venue);
        if (sportCompat < 1)
            continue;
        const distances = participantDistances(venue.location, input.participants);
        if (!isVenueFeasible(distances, input.participants))
            continue;
        const total = totalTravelKm(distances);
        const imbalance = travelImbalanceKm(distances);
        const cScore = centralityScore(venue.location, centroid, input.preferences.preferredRadiusKm);
        const tFair = travelFairnessScore(total, imbalance);
        const tEff = travelEfficiencyScore(total, Math.max(1, baselineTotal));
        const pref = preferenceComposite(input.preferences, venue);
        const avail = availabilityConfidenceScore({ venue, prefs: input.preferences, now });
        const quality = Math.max(0, Math.min(1, venue.qualityScore));
        const homeCourt = resolveHomeCourt(venue, input.participants);
        const parts = {
            centrality: cScore,
            travelFairness: tFair,
            travelEfficiency: tEff,
            venueQuality: quality,
            preferenceMatch: pref.score,
            sportCompatibility: sportCompat,
            availability: avail.score,
        };
        let suitability = weightedSuitability(parts, config.weights);
        if (homeCourt)
            suitability *= config.homeCourtSuitabilityMultiplier;
        const travels = input.participants.map((p, i) => ({
            partyId: p.partyId,
            distanceKm: distances[i],
            estimatedTimeMinutes: estimatedDriveMinutes(distances[i], config.assumedAverageSpeedKmh),
        }));
        const ranked = {
            venueId: venue.id,
            name: venue.name,
            location: venue.location,
            travels,
            totalTravelKm: total,
            travelImbalanceKm: imbalance,
            centralityScore: cScore,
            fairnessScore: tFair,
            suitabilityScore: suitability,
            preferenceMatchScore: pref.score,
            sportCompatibilityScore: sportCompat,
            availabilityConfidence: avail.score,
            homeCourt,
            explanation: "",
            featureBreakdown: {
                distanceToCentroidKm: haversineKm(venue.location, centroid),
                totalTravelKm: total,
                travelImbalanceKm: imbalance,
                minParticipantDistanceKm: Math.min(...distances),
                maxParticipantDistanceKm: Math.max(...distances),
                publicMatch: pref.breakdown.publicMatch,
                priceMatch: pref.breakdown.priceMatch,
                parkingMatch: pref.breakdown.parkingMatch,
                lightingMatch: pref.breakdown.lightingMatch,
                indoorOutdoorMatch: pref.breakdown.indoorOutdoorMatch,
                venueTypeMatch: pref.breakdown.venueTypeMatch,
                scheduleKnown: avail.scheduleKnown,
                rawAvailabilityConfidence: avail.raw,
            },
        };
        ranked.explanation = buildDeterministicVenueExplanation({
            venue,
            participants: input.participants,
            ranked,
        });
        if (input.explanationHook) {
            ranked.explanation = await input.explanationHook(ranked);
        }
        rows.push(ranked);
    }
    rows.sort((a, b) => {
        const s = b.suitabilityScore - a.suitabilityScore;
        if (s !== 0)
            return s;
        const f = b.fairnessScore - a.fairnessScore;
        if (f !== 0)
            return f;
        return a.totalTravelKm - b.totalTravelKm;
    });
    return {
        sport: input.sport,
        centroid,
        generatedAt: now.toISOString(),
        venues: rows,
    };
}
//# sourceMappingURL=service.js.map