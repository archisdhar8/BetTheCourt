import type { GeoPoint } from "../matchmaking/model.js";
import type { IndoorOutdoorPref, ParticipantInput, PriceBand, PriceSensitivity, PublicPrivatePref, SportCode, TimeWindowUtc, VenueDiscoveryPreferences, VenueRecord, VenueType } from "./model.js";
export declare function centroidOf(participants: ParticipantInput[]): GeoPoint;
export declare function participantDistances(venue: GeoPoint, participants: ParticipantInput[]): number[];
export declare function travelImbalanceKm(distancesKm: number[]): number;
export declare function totalTravelKm(distancesKm: number[]): number;
export declare function centralityScore(venue: GeoPoint, centroid: GeoPoint, preferredRadiusKm: number): number;
/**
 * Fairness from travel balance: penalize large imbalance relative to total travel.
 */
export declare function travelFairnessScore(totalKm: number, imbalanceKm: number): number;
/**
 * Prefer lower total travel when feasible (normalized by loose upper bound).
 */
export declare function travelEfficiencyScore(totalKm: number, referenceKm: number): number;
export declare function sportCompatibilityScore(sport: SportCode, venue: VenueRecord): number;
export declare function isVenueFeasible(distancesKm: number[], participants: ParticipantInput[]): boolean;
export declare function resolveHomeCourt(venue: VenueRecord, participants: ParticipantInput[]): boolean;
export declare function priceMatchScore(sensitivity: PriceSensitivity, venueBand: PriceBand | undefined): number;
export declare function publicPrivateMatch(pref: PublicPrivatePref, isPublic: boolean): number;
export declare function parkingMatchScore(importance: number, parkingScore: number | undefined): number;
export declare function lightingMatchScore(importance: number, hasLighting: boolean | undefined): number;
export declare function indoorOutdoorMatchScore(pref: IndoorOutdoorPref, venue: VenueRecord): number;
export declare function venueTypeMatchScore(preferred: VenueType[], venueType: VenueType): number;
export declare function timeWindowOverlapForNow(window: TimeWindowUtc | undefined, now: Date): number;
/**
 * Merge explicit venue confidence, schedule knowledge, and window overlap.
 * When live availability is missing, still returns a conservative positive score.
 */
export declare function availabilityConfidenceScore(input: {
    venue: VenueRecord;
    prefs: VenueDiscoveryPreferences;
    now: Date;
}): {
    score: number;
    scheduleKnown: boolean;
    raw: number;
};
export type PreferenceBreakdown = {
    publicMatch: number;
    priceMatch: number;
    parkingMatch: number;
    lightingMatch: number;
    indoorOutdoorMatch: number;
    venueTypeMatch: number;
};
export declare function preferenceComposite(prefs: VenueDiscoveryPreferences, venue: VenueRecord): {
    score: number;
    breakdown: PreferenceBreakdown;
};
export declare function estimatedDriveMinutes(distanceKm: number, speedKmh: number): number;
//# sourceMappingURL=scoring.d.ts.map