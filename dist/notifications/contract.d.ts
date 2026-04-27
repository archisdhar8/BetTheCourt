import { z } from "zod";
export declare const listNotificationsQuerySchema: z.ZodObject<{
    unreadOnly: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"true">, z.ZodLiteral<"false">]>>, boolean | undefined, "true" | "false" | undefined>;
}, "strip", z.ZodTypeAny, {
    unreadOnly?: boolean | undefined;
}, {
    unreadOnly?: "true" | "false" | undefined;
}>;
//# sourceMappingURL=contract.d.ts.map