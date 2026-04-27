import { z } from "zod";
export const createWalletBodySchema = z.object({
    userId: z.string().min(1).max(128),
    currency: z.string().min(3).max(8),
});
export const creditWalletBodySchema = z.object({
    amountMinor: z.number().int().positive(),
    currency: z.string().min(3).max(8),
    idempotencyKey: z.string().min(1).max(128),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const debitWalletBodySchema = z.object({
    amountMinor: z.number().int().positive(),
    currency: z.string().min(3).max(8),
    idempotencyKey: z.string().min(1).max(128),
});
export const lockEscrowBodySchema = z.object({
    userId: z.string().min(1).max(128),
    idempotencyKey: z.string().min(1).max(128),
});
export const refundEscrowBodySchema = z.object({
    idempotencyKey: z.string().min(1).max(128),
});
export const payoutEscrowBodySchema = z.object({
    winnerUserId: z.string().min(1).max(128),
    platformFeeMinor: z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().min(1).max(128),
});
//# sourceMappingURL=contract.js.map