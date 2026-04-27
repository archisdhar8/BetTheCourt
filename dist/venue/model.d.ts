import type { GeoPoint } from "../matchmaking/model.js";
export type SportCode = "basketball" | "golf" | "tennis" | "pickleball" | "soccer" | (string & {});
export type VenueType = "court" | "park" | "course" | "facility" | "field" | "other";
export type PriceBand = "free" | "low" | "mid" | "high";
export type PublicPrivatePref = "public" | "private" | "either";
export type IndoorOutdoorPref = "indoor" | "outdoor" | "either";
export type PriceSensitivity = "free_only" | "budget" | "any";
/** Half-open UTC minute window (same convention as matchmaking). */
export type TimeWindowUtc = {
    weekday: number;
    startMinute: number;
    endMinute: number;
};
export type ParticipantInput = {
    partyId: string;
    location: GeoPoint;
    maxTravelDistanceKm: number;
    /** Venues claimed or proposed by this party (home-court labeling). */
    homeVenueIds?: string[];
};
export type VenueRecord = {
    id: string;
    name?: string;
    location: GeoPoint;
    /** Sports supported at this location. */
    sports: SportCode[];
    venueType: VenueType;
    isPublic: boolean;
    /** 0–1 curated / OSM-derived quality. */
    qualityScore: number;
    /** When hours/schedule relative to the request window are unknown, keep ranking but lower confidence. */
    scheduleKnown?: boolean;
    /** 0–1 explicit confidence; merged with fallbacks in scoring. */
    availabilityConfidence?: number;
    indoorCapable?: boolean;
    outdoorCapable?: boolean;
    hasLighting?: boolean;
    /** 0 = none, 1 = ample. */
    parkingScore?: number;
    priceBand?: PriceBand;
    /** If set, treated as home/affiliated venue for this party (flags home-court). */
    affiliatedPartyId?: string;
};
export type VenueDiscoveryPreferences = {
    preferredRadiusKm: number;
    preferredVenueTypes: VenueType[];
    timeWindowUtc?: TimeWindowUtc;
    publicPrivate: PublicPrivatePref;
    priceSensitivity: PriceSensitivity;
    /** 0 = ignore, 1 = must-have. */
    parkingImportance: number;
    /** 0 = ignore, 1 = must-have for evening play. */
    lightingImportance: number;
    indoorOutdoor: IndoorOutdoorPref;
};
export type VenueDiscoveryWeights = {
    centrality: number;
    travelFairness: number;
    travelEfficiency: number;
    venueQuality: number;
    preferenceMatch: number;
    sportCompatibility: number;
    availability: number;
};
export type VenueDiscoveryConfig = {
    weights: VenueDiscoveryWeights;
    /** Penalize composite suitability when `homeCourt` is true (travel fairness unchanged). */
    homeCourtSuitabilityMultiplier: number;
    /** Typical urban/suburban driving speed for ETA heuristic (km/h). */
    assumedAverageSpeedKmh: number;
};
export type PartialVenueDiscoveryWeights = Partial<VenueDiscoveryWeights>;
export type PartialVenueDiscoveryConfig = Omit<Partial<VenueDiscoveryConfig>, "weights"> & {
    weights?: PartialVenueDiscoveryWeights;
};
export type ParticipantTravel = {
    partyId: string;
    distanceKm: number;
    estimatedTimeMinutes: number;
};
export type RankedVenue = {
    venueId: string;
    name?: string;
    location: GeoPoint;
    travels: ParticipantTravel[];
    totalTravelKm: number;
    travelImbalanceKm: number;
    centralityScore: number;
    /** Travel balance only (does not encode home-court). */
    fairnessScore: number;
    /** End-to-end deterministic ranking score (includes preference + home-court penalty). */
    suitabilityScore: number;
    preferenceMatchScore: number;
    sportCompatibilityScore: number;
    availabilityConfidence: number;
    homeCourt: boolean;
    explanation: string;
    featureBreakdown: {
        distanceToCentroidKm: number;
        totalTravelKm: number;
        travelImbalanceKm: number;
        minParticipantDistanceKm: number;
        maxParticipantDistanceKm: number;
        publicMatch: number;
        priceMatch: number;
        parkingMatch: number;
        lightingMatch: number;
        indoorOutdoorMatch: number;
        venueTypeMatch: number;
        scheduleKnown: boolean;
        rawAvailabilityConfidence: number;
    };
};
export type VenueDiscoveryResult = {
    sport: SportCode;
    centroid: GeoPoint;
    generatedAt: string;
    venues: RankedVenue[];
};
//# sourceMappingURL=model.d.ts.map