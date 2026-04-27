import { z } from "zod";
export declare const submitCheckinBodySchema: z.ZodObject<{
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
    lat: z.ZodNumber;
    lng: z.ZodNumber;
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
    lat: number;
    lng: number;
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
    lat: number;
    lng: number;
}>;
//# sourceMappingURL=contract.d.ts.map