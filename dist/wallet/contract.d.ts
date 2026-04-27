import { z } from "zod";
export declare const createWalletBodySchema: z.ZodObject<{
    userId: z.ZodString;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    currency: string;
}, {
    userId: string;
    currency: string;
}>;
export declare const creditWalletBodySchema: z.ZodObject<{
    amountMinor: z.ZodNumber;
    currency: z.ZodString;
    idempotencyKey: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amountMinor: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    currency: string;
    amountMinor: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const debitWalletBodySchema: z.ZodObject<{
    amountMinor: z.ZodNumber;
    currency: z.ZodString;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amountMinor: number;
    idempotencyKey: string;
}, {
    currency: string;
    amountMinor: number;
    idempotencyKey: string;
}>;
export declare const lockEscrowBodySchema: z.ZodObject<{
    userId: z.ZodString;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    idempotencyKey: string;
}, {
    userId: string;
    idempotencyKey: string;
}>;
export declare const refundEscrowBodySchema: z.ZodObject<{
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    idempotencyKey: string;
}, {
    idempotencyKey: string;
}>;
export declare const payoutEscrowBodySchema: z.ZodObject<{
    winnerUserId: z.ZodString;
    platformFeeMinor: z.ZodOptional<z.ZodNumber>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    winnerUserId: string;
    idempotencyKey: string;
    platformFeeMinor?: number | undefined;
}, {
    winnerUserId: string;
    idempotencyKey: string;
    platformFeeMinor?: number | undefined;
}>;
//# sourceMappingURL=contract.d.ts.map