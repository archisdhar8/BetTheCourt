import { z } from "zod";
export declare const sportCodeSchema: z.ZodString;
export declare const venueTypeSchema: z.ZodEnum<["court", "park", "course", "facility", "field", "other"]>;
export declare const priceBandSchema: z.ZodEnum<["free", "low", "mid", "high"]>;
export declare const publicPrivatePrefSchema: z.ZodEnum<["public", "private", "either"]>;
export declare const indoorOutdoorPrefSchema: z.ZodEnum<["indoor", "outdoor", "either"]>;
export declare const priceSensitivitySchema: z.ZodEnum<["free_only", "budget", "any"]>;
export declare const timeWindowUtcSchema: z.ZodObject<{
    weekday: z.ZodNumber;
    startMinute: z.ZodNumber;
    endMinute: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    weekday: number;
    startMinute: number;
    endMinute: number;
}, {
    weekday: number;
    startMinute: number;
    endMinute: number;
}>;
export declare const participantInputSchema: z.ZodObject<{
    partyId: z.ZodString;
    location: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    maxTravelDistanceKm: z.ZodNumber;
    homeVenueIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    partyId: string;
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    homeVenueIds?: string[] | undefined;
}, {
    partyId: string;
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    homeVenueIds?: string[] | undefined;
}>;
export declare const venueRecordSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    location: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    sports: z.ZodArray<z.ZodString, "many">;
    venueType: z.ZodEnum<["court", "park", "course", "facility", "field", "other"]>;
    isPublic: z.ZodBoolean;
    qualityScore: z.ZodNumber;
    scheduleKnown: z.ZodOptional<z.ZodBoolean>;
    availabilityConfidence: z.ZodOptional<z.ZodNumber>;
    indoorCapable: z.ZodOptional<z.ZodBoolean>;
    outdoorCapable: z.ZodOptional<z.ZodBoolean>;
    hasLighting: z.ZodOptional<z.ZodBoolean>;
    parkingScore: z.ZodOptional<z.ZodNumber>;
    priceBand: z.ZodOptional<z.ZodEnum<["free", "low", "mid", "high"]>>;
    affiliatedPartyId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    location: {
        lat: number;
        lng: number;
    };
    sports: string[];
    venueType: "court" | "park" | "course" | "facility" | "field" | "other";
    isPublic: boolean;
    qualityScore: number;
    name?: string | undefined;
    scheduleKnown?: boolean | undefined;
    availabilityConfidence?: number | undefined;
    indoorCapable?: boolean | undefined;
    outdoorCapable?: boolean | undefined;
    hasLighting?: boolean | undefined;
    parkingScore?: number | undefined;
    priceBand?: "free" | "low" | "mid" | "high" | undefined;
    affiliatedPartyId?: string | undefined;
}, {
    id: string;
    location: {
        lat: number;
        lng: number;
    };
    sports: string[];
    venueType: "court" | "park" | "course" | "facility" | "field" | "other";
    isPublic: boolean;
    qualityScore: number;
    name?: string | undefined;
    scheduleKnown?: boolean | undefined;
    availabilityConfidence?: number | undefined;
    indoorCapable?: boolean | undefined;
    outdoorCapable?: boolean | undefined;
    hasLighting?: boolean | undefined;
    parkingScore?: number | undefined;
    priceBand?: "free" | "low" | "mid" | "high" | undefined;
    affiliatedPartyId?: string | undefined;
}>;
export declare const venueDiscoveryPreferencesSchema: z.ZodObject<{
    preferredRadiusKm: z.ZodNumber;
    preferredVenueTypes: z.ZodArray<z.ZodEnum<["court", "park", "course", "facility", "field", "other"]>, "many">;
    timeWindowUtc: z.ZodOptional<z.ZodObject<{
        weekday: z.ZodNumber;
        startMinute: z.ZodNumber;
        endMinute: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }, {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }>>;
    publicPrivate: z.ZodEnum<["public", "private", "either"]>;
    priceSensitivity: z.ZodEnum<["free_only", "budget", "any"]>;
    parkingImportance: z.ZodNumber;
    lightingImportance: z.ZodNumber;
    indoorOutdoor: z.ZodEnum<["indoor", "outdoor", "either"]>;
}, "strip", z.ZodTypeAny, {
    preferredRadiusKm: number;
    preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
    publicPrivate: "public" | "private" | "either";
    priceSensitivity: "free_only" | "budget" | "any";
    parkingImportance: number;
    lightingImportance: number;
    indoorOutdoor: "either" | "indoor" | "outdoor";
    timeWindowUtc?: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    } | undefined;
}, {
    preferredRadiusKm: number;
    preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
    publicPrivate: "public" | "private" | "either";
    priceSensitivity: "free_only" | "budget" | "any";
    parkingImportance: number;
    lightingImportance: number;
    indoorOutdoor: "either" | "indoor" | "outdoor";
    timeWindowUtc?: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    } | undefined;
}>;
export declare const venueDiscoveryRequestSchema: z.ZodObject<{
    sport: z.ZodString;
    participants: z.ZodArray<z.ZodObject<{
        partyId: z.ZodString;
        location: z.ZodObject<{
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
        }, {
            lat: number;
            lng: number;
        }>;
        maxTravelDistanceKm: z.ZodNumber;
        homeVenueIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        homeVenueIds?: string[] | undefined;
    }, {
        partyId: string;
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        homeVenueIds?: string[] | undefined;
    }>, "many">;
    venues: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        location: z.ZodObject<{
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
        }, {
            lat: number;
            lng: number;
        }>;
        sports: z.ZodArray<z.ZodString, "many">;
        venueType: z.ZodEnum<["court", "park", "course", "facility", "field", "other"]>;
        isPublic: z.ZodBoolean;
        qualityScore: z.ZodNumber;
        scheduleKnown: z.ZodOptional<z.ZodBoolean>;
        availabilityConfidence: z.ZodOptional<z.ZodNumber>;
        indoorCapable: z.ZodOptional<z.ZodBoolean>;
        outdoorCapable: z.ZodOptional<z.ZodBoolean>;
        hasLighting: z.ZodOptional<z.ZodBoolean>;
        parkingScore: z.ZodOptional<z.ZodNumber>;
        priceBand: z.ZodOptional<z.ZodEnum<["free", "low", "mid", "high"]>>;
        affiliatedPartyId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        location: {
            lat: number;
            lng: number;
        };
        sports: string[];
        venueType: "court" | "park" | "course" | "facility" | "field" | "other";
        isPublic: boolean;
        qualityScore: number;
        name?: string | undefined;
        scheduleKnown?: boolean | undefined;
        availabilityConfidence?: number | undefined;
        indoorCapable?: boolean | undefined;
        outdoorCapable?: boolean | undefined;
        hasLighting?: boolean | undefined;
        parkingScore?: number | undefined;
        priceBand?: "free" | "low" | "mid" | "high" | undefined;
        affiliatedPartyId?: string | undefined;
    }, {
        id: string;
        location: {
            lat: number;
            lng: number;
        };
        sports: string[];
        venueType: "court" | "park" | "course" | "facility" | "field" | "other";
        isPublic: boolean;
        qualityScore: number;
        name?: string | undefined;
        scheduleKnown?: boolean | undefined;
        availabilityConfidence?: number | undefined;
        indoorCapable?: boolean | undefined;
        outdoorCapable?: boolean | undefined;
        hasLighting?: boolean | undefined;
        parkingScore?: number | undefined;
        priceBand?: "free" | "low" | "mid" | "high" | undefined;
        affiliatedPartyId?: string | undefined;
    }>, "many">;
    preferences: z.ZodObject<{
        preferredRadiusKm: z.ZodNumber;
        preferredVenueTypes: z.ZodArray<z.ZodEnum<["court", "park", "course", "facility", "field", "other"]>, "many">;
        timeWindowUtc: z.ZodOptional<z.ZodObject<{
            weekday: z.ZodNumber;
            startMinute: z.ZodNumber;
            endMinute: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }, {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }>>;
        publicPrivate: z.ZodEnum<["public", "private", "either"]>;
        priceSensitivity: z.ZodEnum<["free_only", "budget", "any"]>;
        parkingImportance: z.ZodNumber;
        lightingImportance: z.ZodNumber;
        indoorOutdoor: z.ZodEnum<["indoor", "outdoor", "either"]>;
    }, "strip", z.ZodTypeAny, {
        preferredRadiusKm: number;
        preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
        publicPrivate: "public" | "private" | "either";
        priceSensitivity: "free_only" | "budget" | "any";
        parkingImportance: number;
        lightingImportance: number;
        indoorOutdoor: "either" | "indoor" | "outdoor";
        timeWindowUtc?: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        } | undefined;
    }, {
        preferredRadiusKm: number;
        preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
        publicPrivate: "public" | "private" | "either";
        priceSensitivity: "free_only" | "budget" | "any";
        parkingImportance: number;
        lightingImportance: number;
        indoorOutdoor: "either" | "indoor" | "outdoor";
        timeWindowUtc?: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        } | undefined;
    }>;
    now: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        homeCourtSuitabilityMultiplier: z.ZodOptional<z.ZodNumber>;
        assumedAverageSpeedKmh: z.ZodOptional<z.ZodNumber>;
        weights: z.ZodOptional<z.ZodObject<{
            centrality: z.ZodOptional<z.ZodNumber>;
            travelFairness: z.ZodOptional<z.ZodNumber>;
            travelEfficiency: z.ZodOptional<z.ZodNumber>;
            venueQuality: z.ZodOptional<z.ZodNumber>;
            preferenceMatch: z.ZodOptional<z.ZodNumber>;
            sportCompatibility: z.ZodOptional<z.ZodNumber>;
            availability: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        }, {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        weights?: {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        } | undefined;
        homeCourtSuitabilityMultiplier?: number | undefined;
        assumedAverageSpeedKmh?: number | undefined;
    }, {
        weights?: {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        } | undefined;
        homeCourtSuitabilityMultiplier?: number | undefined;
        assumedAverageSpeedKmh?: number | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        useAiExplanations: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        useAiExplanations?: boolean | undefined;
    }, {
        useAiExplanations?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    sport: string;
    participants: {
        partyId: string;
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        homeVenueIds?: string[] | undefined;
    }[];
    venues: {
        id: string;
        location: {
            lat: number;
            lng: number;
        };
        sports: string[];
        venueType: "court" | "park" | "course" | "facility" | "field" | "other";
        isPublic: boolean;
        qualityScore: number;
        name?: string | undefined;
        scheduleKnown?: boolean | undefined;
        availabilityConfidence?: number | undefined;
        indoorCapable?: boolean | undefined;
        outdoorCapable?: boolean | undefined;
        hasLighting?: boolean | undefined;
        parkingScore?: number | undefined;
        priceBand?: "free" | "low" | "mid" | "high" | undefined;
        affiliatedPartyId?: string | undefined;
    }[];
    preferences: {
        preferredRadiusKm: number;
        preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
        publicPrivate: "public" | "private" | "either";
        priceSensitivity: "free_only" | "budget" | "any";
        parkingImportance: number;
        lightingImportance: number;
        indoorOutdoor: "either" | "indoor" | "outdoor";
        timeWindowUtc?: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        } | undefined;
    };
    now?: string | undefined;
    config?: {
        weights?: {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        } | undefined;
        homeCourtSuitabilityMultiplier?: number | undefined;
        assumedAverageSpeedKmh?: number | undefined;
    } | undefined;
    options?: {
        useAiExplanations?: boolean | undefined;
    } | undefined;
}, {
    sport: string;
    participants: {
        partyId: string;
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        homeVenueIds?: string[] | undefined;
    }[];
    venues: {
        id: string;
        location: {
            lat: number;
            lng: number;
        };
        sports: string[];
        venueType: "court" | "park" | "course" | "facility" | "field" | "other";
        isPublic: boolean;
        qualityScore: number;
        name?: string | undefined;
        scheduleKnown?: boolean | undefined;
        availabilityConfidence?: number | undefined;
        indoorCapable?: boolean | undefined;
        outdoorCapable?: boolean | undefined;
        hasLighting?: boolean | undefined;
        parkingScore?: number | undefined;
        priceBand?: "free" | "low" | "mid" | "high" | undefined;
        affiliatedPartyId?: string | undefined;
    }[];
    preferences: {
        preferredRadiusKm: number;
        preferredVenueTypes: ("court" | "park" | "course" | "facility" | "field" | "other")[];
        publicPrivate: "public" | "private" | "either";
        priceSensitivity: "free_only" | "budget" | "any";
        parkingImportance: number;
        lightingImportance: number;
        indoorOutdoor: "either" | "indoor" | "outdoor";
        timeWindowUtc?: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        } | undefined;
    };
    now?: string | undefined;
    config?: {
        weights?: {
            centrality?: number | undefined;
            travelFairness?: number | undefined;
            travelEfficiency?: number | undefined;
            venueQuality?: number | undefined;
            preferenceMatch?: number | undefined;
            sportCompatibility?: number | undefined;
            availability?: number | undefined;
        } | undefined;
        homeCourtSuitabilityMultiplier?: number | undefined;
        assumedAverageSpeedKmh?: number | undefined;
    } | undefined;
    options?: {
        useAiExplanations?: boolean | undefined;
    } | undefined;
}>;
export type VenueDiscoveryRequestDTO = z.infer<typeof venueDiscoveryRequestSchema>;
//# sourceMappingURL=contract.d.ts.map