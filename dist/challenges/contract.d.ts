import { z } from "zod";
export declare const actorSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"party">;
    partyId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    partyId: string;
    kind: "party";
}, {
    partyId: string;
    kind: "party";
}>, z.ZodObject<{
    kind: z.ZodLiteral<"system">;
}, "strip", z.ZodTypeAny, {
    kind: "system";
}, {
    kind: "system";
}>, z.ZodObject<{
    kind: z.ZodLiteral<"admin">;
    adminId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "admin";
    adminId: string;
}, {
    kind: "admin";
    adminId: string;
}>]>;
export declare const createChallengeBodySchema: z.ZodObject<{
    sport: z.ZodString;
    mode: z.ZodEnum<["1v1", "team"]>;
    creatorPartyId: z.ZodString;
    opponentPartyId: z.ZodString;
    stakeMinor: z.ZodNumber;
    currency: z.ZodString;
    /** `pending` (default) auto-applies draft→submit; `draft` keeps the challenge editable until submit via API (future) or internal tooling. */
    initialState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["draft", "pending"]>>>;
}, "strip", z.ZodTypeAny, {
    mode: "1v1" | "team";
    creatorPartyId: string;
    opponentPartyId: string;
    sport: string;
    currency: string;
    stakeMinor: number;
    initialState: "draft" | "pending";
}, {
    mode: "1v1" | "team";
    creatorPartyId: string;
    opponentPartyId: string;
    sport: string;
    currency: string;
    stakeMinor: number;
    initialState?: "draft" | "pending" | undefined;
}>;
export declare const withActor: <T extends z.ZodRawShape>(shape: T) => z.ZodObject<T & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<T & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const acceptBodySchema: z.ZodObject<{
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}>;
export declare const declineBodySchema: z.ZodObject<{
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}>;
export declare const cancelBodySchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
} & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    reason?: string | undefined;
}, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    reason?: string | undefined;
}>;
export declare const patchVenueBodySchema: z.ZodObject<{
    venueId: z.ZodString;
} & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    venueId: string;
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}, {
    venueId: string;
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}>;
export declare const resolveDisputeBodySchema: z.ZodObject<{
    resolution: z.ZodEnum<["confirm", "refund"]>;
    note: z.ZodOptional<z.ZodString>;
} & {
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    resolution: "confirm" | "refund";
    note?: string | undefined;
}, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    resolution: "confirm" | "refund";
    note?: string | undefined;
}>;
export declare const payoutBodySchema: z.ZodObject<{
    actor: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"party">;
        partyId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partyId: string;
        kind: "party";
    }, {
        partyId: string;
        kind: "party";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
    }, "strip", z.ZodTypeAny, {
        kind: "system";
    }, {
        kind: "system";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"admin">;
        adminId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "admin";
        adminId: string;
    }, {
        kind: "admin";
        adminId: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}, {
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
}>;
//# sourceMappingURL=contract.d.ts.map