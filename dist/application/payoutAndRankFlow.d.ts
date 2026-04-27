import type { ApplicationDeps, PayoutAndRankFlowInput } from "./model.js";
/**
 * Escrow payout (includes in-wallet fraud gate via `FraudService.assertPayoutAllowed`),
 * then applies Elo via `RankingService` when payout succeeds.
 *
 * On `fraud_payout_blocked`, emits `fraud_hold` to both participants, then rethrows.
 * On success, emits `payout_completed` and `ranking_updated` to both parties.
 */
export declare function payoutAndRankFlow(deps: ApplicationDeps, input: PayoutAndRankFlowInput): Promise<{
    payout: import("../wallet/service.js").PayoutEscrowResult;
    ranking: import("../ranking/model.js").ApplyRankingResult;
}>;
//# sourceMappingURL=payoutAndRankFlow.d.ts.map