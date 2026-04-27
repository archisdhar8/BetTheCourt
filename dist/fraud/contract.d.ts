import { z } from "zod";
export declare const evaluateFraudBodySchema: z.ZodObject<{
    context: z.ZodOptional<z.ZodEnum<["standard", "payout_attempt"]>>;
    emitPlaceholderSignals: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    context?: "standard" | "payout_attempt" | undefined;
    emitPlaceholderSignals?: boolean | undefined;
}, {
    context?: "standard" | "payout_attempt" | undefined;
    emitPlaceholderSignals?: boolean | undefined;
}>;
//# sourceMappingURL=contract.d.ts.map