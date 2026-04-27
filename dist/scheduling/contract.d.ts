import { z } from "zod";
export declare const timeSlotInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    startAt: z.ZodString;
    endAt: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startAt: string;
    endAt: string;
    id?: string | undefined;
    note?: string | undefined;
}, {
    startAt: string;
    endAt: string;
    id?: string | undefined;
    note?: string | undefined;
}>;
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
export declare const proposeScheduleSlotsBodySchema: z.ZodObject<{
    slots: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        startAt: z.ZodString;
        endAt: z.ZodString;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startAt: string;
        endAt: string;
        id?: string | undefined;
        note?: string | undefined;
    }, {
        startAt: string;
        endAt: string;
        id?: string | undefined;
        note?: string | undefined;
    }>, "many">;
    expiresAt: z.ZodString;
    travelBufferMinutes: z.ZodOptional<z.ZodNumber>;
    venue: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
    creatorLocation: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
    opponentLocation: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
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
    slots: {
        startAt: string;
        endAt: string;
        id?: string | undefined;
        note?: string | undefined;
    }[];
    expiresAt: string;
    venue?: {
        lat: number;
        lng: number;
    } | undefined;
    travelBufferMinutes?: number | undefined;
    creatorLocation?: {
        lat: number;
        lng: number;
    } | undefined;
    opponentLocation?: {
        lat: number;
        lng: number;
    } | undefined;
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
    slots: {
        startAt: string;
        endAt: string;
        id?: string | undefined;
        note?: string | undefined;
    }[];
    expiresAt: string;
    venue?: {
        lat: number;
        lng: number;
    } | undefined;
    travelBufferMinutes?: number | undefined;
    creatorLocation?: {
        lat: number;
        lng: number;
    } | undefined;
    opponentLocation?: {
        lat: number;
        lng: number;
    } | undefined;
}>;
export declare const confirmScheduleSlotBodySchema: z.ZodObject<{
    slotId: z.ZodString;
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
    slotId: string;
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
    slotId: string;
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
export declare const cancelScheduleProposalBodySchema: z.ZodObject<{
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
export declare const expireScheduleBodySchema: z.ZodObject<{
    asOf: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    asOf?: string | undefined;
}, {
    asOf?: string | undefined;
}>;
//# sourceMappingURL=contract.d.ts.map