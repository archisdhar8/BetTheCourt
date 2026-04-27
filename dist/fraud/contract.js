import { z } from "zod";
export const evaluateFraudBodySchema = z.object({
    context: z.enum(["standard", "payout_attempt"]).optional(),
    emitPlaceholderSignals: z.boolean().optional(),
});
//# sourceMappingURL=contract.js.map