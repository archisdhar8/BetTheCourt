import { z } from "zod";
export const sportCodeSchema = z.string().min(1).max(64);
export const geoPointSchema = z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
});
export const moneyRangeSchema = z.object({
    currency: z.string().min(3).max(8),
    minMinor: z.number().int().nonnegative(),
    maxMinor: z.number().int().nonnegative(),
});
export const timeWindowSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(24 * 60),
    endMinute: z.number().int().min(0).max(24 * 60),
});
export const matchFormatSchema = z.enum(["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]);
const baseSeeker = {
    sport: sportCodeSchema,
    location: geoPointSchema,
    maxTravelDistanceKm: z.number().positive(),
    skillRating: z.number(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    preferredStake: moneyRangeSchema.refine((v) => v.maxMinor >= v.minMinor, {
        message: "maxMinor must be >= minMinor",
    }),
    preferredFormats: z.array(matchFormatSchema).min(1),
    availabilityUtc: z.array(timeWindowSchema),
    trustScore: z.number().min(0).max(100),
    verificationScore: z.number().min(0).max(100),
    lastActiveAt: z.string().datetime(),
    rivalryModeEnabled: z.boolean().optional(),
};
export const userSeekerSchema = z.object({
    kind: z.literal("user"),
    userId: z.string().min(1),
    pastOpponentIds: z.array(z.string().min(1)),
    ...baseSeeker,
});
export const teamSeekerSchema = z.object({
    kind: z.literal("team"),
    teamId: z.string().min(1),
    captainUserId: z.string().min(1),
    memberUserIds: z.array(z.string().min(1)).min(1),
    pastOpponentTeamIds: z.array(z.string().min(1)),
    ...baseSeeker,
});
export const seekerProfileSchema = z.discriminatedUnion("kind", [userSeekerSchema, teamSeekerSchema]);
export const userCandidateSchema = z.object({
    party: z.literal("user"),
    userId: z.string().min(1),
    displayName: z.string().min(1).optional(),
    sport: sportCodeSchema,
    location: geoPointSchema,
    skillRating: z.number(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    preferredStake: moneyRangeSchema.refine((v) => v.maxMinor >= v.minMinor, {
        message: "maxMinor must be >= minMinor",
    }),
    preferredFormats: z.array(matchFormatSchema).min(1),
    availabilityUtc: z.array(timeWindowSchema),
    trustScore: z.number().min(0).max(100),
    verificationScore: z.number().min(0).max(100),
    lastActiveAt: z.string().datetime(),
});
export const teamCandidateSchema = z.object({
    party: z.literal("team"),
    teamId: z.string().min(1),
    name: z.string().min(1).optional(),
    memberCount: z.number().int().positive(),
    sport: sportCodeSchema,
    location: geoPointSchema,
    skillRating: z.number(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    preferredStake: moneyRangeSchema.refine((v) => v.maxMinor >= v.minMinor, {
        message: "maxMinor must be >= minMinor",
    }),
    preferredFormats: z.array(matchFormatSchema).min(1),
    availabilityUtc: z.array(timeWindowSchema),
    trustScore: z.number().min(0).max(100),
    verificationScore: z.number().min(0).max(100),
    lastActiveAt: z.string().datetime(),
});
export const candidateSchema = z.discriminatedUnion("party", [userCandidateSchema, teamCandidateSchema]);
export const matchmakingRequestSchema = z.object({
    seeker: seekerProfileSchema,
    candidates: z.array(candidateSchema).max(500),
    /** ISO time for deterministic tests; defaults to server now. */
    now: z.string().datetime().optional(),
    config: z
        .object({
        skillRatingBand: z.number().positive().optional(),
        activityHalfLifeHours: z.number().positive().optional(),
        rivalryModeEnabled: z.boolean().optional(),
        weights: z
            .object({
            distance: z.number().nonnegative().optional(),
            skillFit: z.number().nonnegative().optional(),
            activity: z.number().nonnegative().optional(),
            trust: z.number().nonnegative().optional(),
            stakeOverlap: z.number().nonnegative().optional(),
            rematch: z.number().nonnegative().optional(),
        })
            .optional(),
    })
        .optional(),
    options: z
        .object({
        /** If true, response explanations are passed through the optional AI rewriter (server must configure it). */
        useAiExplanations: z.boolean().optional(),
    })
        .optional(),
});
//# sourceMappingURL=contract.js.map