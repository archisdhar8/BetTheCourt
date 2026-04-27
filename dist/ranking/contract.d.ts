import { z } from "zod";
export declare const leaderboardQuerySchema: z.ZodObject<{
    window: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all_time", "weekly"]>>>;
}, "strip", z.ZodTypeAny, {
    window: "all_time" | "weekly";
}, {
    window?: "all_time" | "weekly" | undefined;
}>;
export declare const applyRankingBodySchema: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
//# sourceMappingURL=contract.d.ts.map