import { z } from "zod";
export declare const submitResultBodySchema: z.ZodObject<{
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
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
    payload: Record<string, unknown>;
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
    payload: Record<string, unknown>;
}>;
export declare const confirmResultBodySchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
    ackFingerprint: z.ZodOptional<z.ZodString>;
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
    note?: string | undefined;
    ackFingerprint?: string | undefined;
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
    note?: string | undefined;
    ackFingerprint?: string | undefined;
}>;
export declare const disputeResultBodySchema: z.ZodObject<{
    reason: z.ZodString;
    counterPayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
    reason: string;
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    counterPayload?: Record<string, unknown> | undefined;
}, {
    reason: string;
    actor: {
        partyId: string;
        kind: "party";
    } | {
        kind: "system";
    } | {
        kind: "admin";
        adminId: string;
    };
    counterPayload?: Record<string, unknown> | undefined;
}>;
//# sourceMappingURL=contract.d.ts.map