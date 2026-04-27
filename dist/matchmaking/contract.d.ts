import { z } from "zod";
export declare const sportCodeSchema: z.ZodString;
export declare const geoPointSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
export declare const moneyRangeSchema: z.ZodObject<{
    currency: z.ZodString;
    minMinor: z.ZodNumber;
    maxMinor: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    currency: string;
    minMinor: number;
    maxMinor: number;
}, {
    currency: string;
    minMinor: number;
    maxMinor: number;
}>;
export declare const timeWindowSchema: z.ZodObject<{
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
export declare const matchFormatSchema: z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>;
export declare const userSeekerSchema: z.ZodObject<{
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
    rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
    kind: z.ZodLiteral<"user">;
    userId: z.ZodString;
    pastOpponentIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "user";
    location: {
        lat: number;
        lng: number;
    };
    pastOpponentIds: string[];
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    rivalryModeEnabled?: boolean | undefined;
}, {
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "user";
    location: {
        lat: number;
        lng: number;
    };
    pastOpponentIds: string[];
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    rivalryModeEnabled?: boolean | undefined;
}>;
export declare const teamSeekerSchema: z.ZodObject<{
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
    rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
    kind: z.ZodLiteral<"team">;
    teamId: z.ZodString;
    captainUserId: z.ZodString;
    memberUserIds: z.ZodArray<z.ZodString, "many">;
    pastOpponentTeamIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "team";
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    captainUserId: string;
    memberUserIds: string[];
    pastOpponentTeamIds: string[];
    rivalryModeEnabled?: boolean | undefined;
}, {
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "team";
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    captainUserId: string;
    memberUserIds: string[];
    pastOpponentTeamIds: string[];
    rivalryModeEnabled?: boolean | undefined;
}>;
export declare const seekerProfileSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
    rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
    kind: z.ZodLiteral<"user">;
    userId: z.ZodString;
    pastOpponentIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "user";
    location: {
        lat: number;
        lng: number;
    };
    pastOpponentIds: string[];
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    rivalryModeEnabled?: boolean | undefined;
}, {
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "user";
    location: {
        lat: number;
        lng: number;
    };
    pastOpponentIds: string[];
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    rivalryModeEnabled?: boolean | undefined;
}>, z.ZodObject<{
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
    rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
    kind: z.ZodLiteral<"team">;
    teamId: z.ZodString;
    captainUserId: z.ZodString;
    memberUserIds: z.ZodArray<z.ZodString, "many">;
    pastOpponentTeamIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "team";
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    captainUserId: string;
    memberUserIds: string[];
    pastOpponentTeamIds: string[];
    rivalryModeEnabled?: boolean | undefined;
}, {
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    kind: "team";
    location: {
        lat: number;
        lng: number;
    };
    maxTravelDistanceKm: number;
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    captainUserId: string;
    memberUserIds: string[];
    pastOpponentTeamIds: string[];
    rivalryModeEnabled?: boolean | undefined;
}>]>;
export declare const userCandidateSchema: z.ZodObject<{
    party: z.ZodLiteral<"user">;
    userId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    party: "user";
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    displayName?: string | undefined;
}, {
    party: "user";
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    displayName?: string | undefined;
}>;
export declare const teamCandidateSchema: z.ZodObject<{
    party: z.ZodLiteral<"team">;
    teamId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    memberCount: z.ZodNumber;
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    party: "team";
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    memberCount: number;
    name?: string | undefined;
}, {
    party: "team";
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    memberCount: number;
    name?: string | undefined;
}>;
export declare const candidateSchema: z.ZodDiscriminatedUnion<"party", [z.ZodObject<{
    party: z.ZodLiteral<"user">;
    userId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    party: "user";
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    displayName?: string | undefined;
}, {
    party: "user";
    userId: string;
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    displayName?: string | undefined;
}>, z.ZodObject<{
    party: z.ZodLiteral<"team">;
    teamId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    memberCount: z.ZodNumber;
    sport: z.ZodString;
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
    skillRating: z.ZodNumber;
    wins: z.ZodNumber;
    losses: z.ZodNumber;
    preferredStake: z.ZodEffects<z.ZodObject<{
        currency: z.ZodString;
        minMinor: z.ZodNumber;
        maxMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }, {
        currency: string;
        minMinor: number;
        maxMinor: number;
    }>;
    preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
    availabilityUtc: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    trustScore: z.ZodNumber;
    verificationScore: z.ZodNumber;
    lastActiveAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    party: "team";
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    memberCount: number;
    name?: string | undefined;
}, {
    party: "team";
    trustScore: number;
    sport: string;
    wins: number;
    losses: number;
    location: {
        lat: number;
        lng: number;
    };
    skillRating: number;
    preferredStake: {
        currency: string;
        minMinor: number;
        maxMinor: number;
    };
    preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
    availabilityUtc: {
        weekday: number;
        startMinute: number;
        endMinute: number;
    }[];
    verificationScore: number;
    lastActiveAt: string;
    teamId: string;
    memberCount: number;
    name?: string | undefined;
}>]>;
export declare const matchmakingRequestSchema: z.ZodObject<{
    seeker: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        sport: z.ZodString;
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
        skillRating: z.ZodNumber;
        wins: z.ZodNumber;
        losses: z.ZodNumber;
        preferredStake: z.ZodEffects<z.ZodObject<{
            currency: z.ZodString;
            minMinor: z.ZodNumber;
            maxMinor: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>;
        preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
        availabilityUtc: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        trustScore: z.ZodNumber;
        verificationScore: z.ZodNumber;
        lastActiveAt: z.ZodString;
        rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
        kind: z.ZodLiteral<"user">;
        userId: z.ZodString;
        pastOpponentIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "user";
        location: {
            lat: number;
            lng: number;
        };
        pastOpponentIds: string[];
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        rivalryModeEnabled?: boolean | undefined;
    }, {
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "user";
        location: {
            lat: number;
            lng: number;
        };
        pastOpponentIds: string[];
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        rivalryModeEnabled?: boolean | undefined;
    }>, z.ZodObject<{
        sport: z.ZodString;
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
        skillRating: z.ZodNumber;
        wins: z.ZodNumber;
        losses: z.ZodNumber;
        preferredStake: z.ZodEffects<z.ZodObject<{
            currency: z.ZodString;
            minMinor: z.ZodNumber;
            maxMinor: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>;
        preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
        availabilityUtc: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        trustScore: z.ZodNumber;
        verificationScore: z.ZodNumber;
        lastActiveAt: z.ZodString;
        rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
        kind: z.ZodLiteral<"team">;
        teamId: z.ZodString;
        captainUserId: z.ZodString;
        memberUserIds: z.ZodArray<z.ZodString, "many">;
        pastOpponentTeamIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "team";
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        captainUserId: string;
        memberUserIds: string[];
        pastOpponentTeamIds: string[];
        rivalryModeEnabled?: boolean | undefined;
    }, {
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "team";
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        captainUserId: string;
        memberUserIds: string[];
        pastOpponentTeamIds: string[];
        rivalryModeEnabled?: boolean | undefined;
    }>]>;
    candidates: z.ZodArray<z.ZodDiscriminatedUnion<"party", [z.ZodObject<{
        party: z.ZodLiteral<"user">;
        userId: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        sport: z.ZodString;
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
        skillRating: z.ZodNumber;
        wins: z.ZodNumber;
        losses: z.ZodNumber;
        preferredStake: z.ZodEffects<z.ZodObject<{
            currency: z.ZodString;
            minMinor: z.ZodNumber;
            maxMinor: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>;
        preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
        availabilityUtc: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        trustScore: z.ZodNumber;
        verificationScore: z.ZodNumber;
        lastActiveAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        party: "user";
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        displayName?: string | undefined;
    }, {
        party: "user";
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        displayName?: string | undefined;
    }>, z.ZodObject<{
        party: z.ZodLiteral<"team">;
        teamId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        memberCount: z.ZodNumber;
        sport: z.ZodString;
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
        skillRating: z.ZodNumber;
        wins: z.ZodNumber;
        losses: z.ZodNumber;
        preferredStake: z.ZodEffects<z.ZodObject<{
            currency: z.ZodString;
            minMinor: z.ZodNumber;
            maxMinor: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }, {
            currency: string;
            minMinor: number;
            maxMinor: number;
        }>;
        preferredFormats: z.ZodArray<z.ZodEnum<["1v1", "2v2", "3v3", "4v4", "5v5", "team_vs_team"]>, "many">;
        availabilityUtc: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        trustScore: z.ZodNumber;
        verificationScore: z.ZodNumber;
        lastActiveAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        party: "team";
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        memberCount: number;
        name?: string | undefined;
    }, {
        party: "team";
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        memberCount: number;
        name?: string | undefined;
    }>]>, "many">;
    /** ISO time for deterministic tests; defaults to server now. */
    now: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        skillRatingBand: z.ZodOptional<z.ZodNumber>;
        activityHalfLifeHours: z.ZodOptional<z.ZodNumber>;
        rivalryModeEnabled: z.ZodOptional<z.ZodBoolean>;
        weights: z.ZodOptional<z.ZodObject<{
            distance: z.ZodOptional<z.ZodNumber>;
            skillFit: z.ZodOptional<z.ZodNumber>;
            activity: z.ZodOptional<z.ZodNumber>;
            trust: z.ZodOptional<z.ZodNumber>;
            stakeOverlap: z.ZodOptional<z.ZodNumber>;
            rematch: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        }, {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        weights?: {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        } | undefined;
        skillRatingBand?: number | undefined;
        activityHalfLifeHours?: number | undefined;
        rivalryModeEnabled?: boolean | undefined;
    }, {
        weights?: {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        } | undefined;
        skillRatingBand?: number | undefined;
        activityHalfLifeHours?: number | undefined;
        rivalryModeEnabled?: boolean | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        /** If true, response explanations are passed through the optional AI rewriter (server must configure it). */
        useAiExplanations: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        useAiExplanations?: boolean | undefined;
    }, {
        useAiExplanations?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    seeker: {
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "user";
        location: {
            lat: number;
            lng: number;
        };
        pastOpponentIds: string[];
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        rivalryModeEnabled?: boolean | undefined;
    } | {
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "team";
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        captainUserId: string;
        memberUserIds: string[];
        pastOpponentTeamIds: string[];
        rivalryModeEnabled?: boolean | undefined;
    };
    candidates: ({
        party: "user";
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        displayName?: string | undefined;
    } | {
        party: "team";
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        memberCount: number;
        name?: string | undefined;
    })[];
    now?: string | undefined;
    config?: {
        weights?: {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        } | undefined;
        skillRatingBand?: number | undefined;
        activityHalfLifeHours?: number | undefined;
        rivalryModeEnabled?: boolean | undefined;
    } | undefined;
    options?: {
        useAiExplanations?: boolean | undefined;
    } | undefined;
}, {
    seeker: {
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "user";
        location: {
            lat: number;
            lng: number;
        };
        pastOpponentIds: string[];
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        rivalryModeEnabled?: boolean | undefined;
    } | {
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        kind: "team";
        location: {
            lat: number;
            lng: number;
        };
        maxTravelDistanceKm: number;
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        captainUserId: string;
        memberUserIds: string[];
        pastOpponentTeamIds: string[];
        rivalryModeEnabled?: boolean | undefined;
    };
    candidates: ({
        party: "user";
        userId: string;
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        displayName?: string | undefined;
    } | {
        party: "team";
        trustScore: number;
        sport: string;
        wins: number;
        losses: number;
        location: {
            lat: number;
            lng: number;
        };
        skillRating: number;
        preferredStake: {
            currency: string;
            minMinor: number;
            maxMinor: number;
        };
        preferredFormats: ("1v1" | "2v2" | "3v3" | "4v4" | "5v5" | "team_vs_team")[];
        availabilityUtc: {
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        verificationScore: number;
        lastActiveAt: string;
        teamId: string;
        memberCount: number;
        name?: string | undefined;
    })[];
    now?: string | undefined;
    config?: {
        weights?: {
            distance?: number | undefined;
            skillFit?: number | undefined;
            activity?: number | undefined;
            trust?: number | undefined;
            stakeOverlap?: number | undefined;
            rematch?: number | undefined;
        } | undefined;
        skillRatingBand?: number | undefined;
        activityHalfLifeHours?: number | undefined;
        rivalryModeEnabled?: boolean | undefined;
    } | undefined;
    options?: {
        useAiExplanations?: boolean | undefined;
    } | undefined;
}>;
export type MatchmakingRequestDTO = z.infer<typeof matchmakingRequestSchema>;
//# sourceMappingURL=contract.d.ts.map