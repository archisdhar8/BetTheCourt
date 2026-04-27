import { z } from "zod";
import { geoPointSchema } from "../matchmaking/contract.js";
export const sportCodeSchema = z.string().min(1).max(64);
export const venueTypeSchema = z.enum(["court", "park", "course", "facility", "field", "other"]);
export const priceBandSchema = z.enum(["free", "low", "mid", "high"]);
export const publicPrivatePrefSchema = z.enum(["public", "private", "either"]);
export const indoorOutdoorPrefSchema = z.enum(["indoor", "outdoor", "either"]);
export const priceSensitivitySchema = z.enum(["free_only", "budget", "any"]);
export const timeWindowUtcSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(24 * 60),
    endMinute: z.number().int().min(0).max(24 * 60),
});
export const participantInputSchema = z.object({
    partyId: z.string().min(1),
    location: geoPointSchema,
    maxTravelDistanceKm: z.number().positive(),
    homeVenueIds: z.array(z.string().min(1)).optional(),
});
export const venueRecordSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    location: geoPointSchema,
    sports: z.array(sportCodeSchema).min(1),
    venueType: venueTypeSchema,
    isPublic: z.boolean(),
    qualityScore: z.number().min(0).max(1),
    scheduleKnown: z.boolean().optional(),
    availabilityConfidence: z.number().min(0).max(1).optional(),
    indoorCapable: z.boolean().optional(),
    outdoorCapable: z.boolean().optional(),
    hasLighting: z.boolean().optional(),
    parkingScore: z.number().min(0).max(1).optional(),
    priceBand: priceBandSchema.optional(),
    affiliatedPartyId: z.string().min(1).optional(),
});
export const venueDiscoveryPreferencesSchema = z.object({
    preferredRadiusKm: z.number().positive(),
    preferredVenueTypes: z.array(venueTypeSchema).min(1),
    timeWindowUtc: timeWindowUtcSchema.optional(),
    publicPrivate: publicPrivatePrefSchema,
    priceSensitivity: priceSensitivitySchema,
    parkingImportance: z.number().min(0).max(1),
    lightingImportance: z.number().min(0).max(1),
    indoorOutdoor: indoorOutdoorPrefSchema,
});
export const venueDiscoveryRequestSchema = z.object({
    sport: sportCodeSchema,
    participants: z.array(participantInputSchema).min(2).max(24),
    venues: z.array(venueRecordSchema).max(2000),
    preferences: venueDiscoveryPreferencesSchema,
    now: z.string().datetime().optional(),
    config: z
        .object({
        homeCourtSuitabilityMultiplier: z.number().positive().max(1).optional(),
        assumedAverageSpeedKmh: z.number().positive().optional(),
        weights: z
            .object({
            centrality: z.number().nonnegative().optional(),
            travelFairness: z.number().nonnegative().optional(),
            travelEfficiency: z.number().nonnegative().optional(),
            venueQuality: z.number().nonnegative().optional(),
            preferenceMatch: z.number().nonnegative().optional(),
            sportCompatibility: z.number().nonnegative().optional(),
            availability: z.number().nonnegative().optional(),
        })
            .optional(),
    })
        .optional(),
    options: z
        .object({
        useAiExplanations: z.boolean().optional(),
    })
        .optional(),
});
//# sourceMappingURL=contract.js.map