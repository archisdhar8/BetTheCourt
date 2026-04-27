import { WalletDomainError } from "../wallet/model.js";
import type { ApplicationDeps, PayoutAndRankFlowInput } from "./model.js";

/**
 * Escrow payout (includes in-wallet fraud gate via `FraudService.assertPayoutAllowed`),
 * then applies Elo via `RankingService` when payout succeeds.
 *
 * On `fraud_payout_blocked`, emits `fraud_hold` to both participants, then rethrows.
 * On success, emits `payout_completed` and `ranking_updated` to both parties.
 */
export async function payoutAndRankFlow(deps: ApplicationDeps, input: PayoutAndRankFlowInput) {
  try {
    const payout = await deps.wallet.payoutChallengeEscrow({
      challengeId: input.challengeId,
      winnerUserId: input.winnerUserId,
      platformFeeMinor: input.platformFeeMinor,
      idempotencyKey: input.idempotencyKey,
    });
    const ch = payout.challenge;

    const ranking = await deps.ranking.applyRankingFromConfirmedChallenge(input.challengeId);

    if (ranking.applied) {
      const payoutMeta = {
        challengeId: ch.id,
        winnerUserId: input.winnerUserId,
        ledgerEntryIds: payout.ledgerEntryIds,
      };
      const rankingMeta = {
        challengeId: ch.id,
        applied: ranking.applied,
        alreadyApplied: ranking.alreadyApplied,
        winnerPartyId: ranking.winnerPartyId,
      };

      for (const userId of [ch.creatorPartyId, ch.opponentPartyId] as const) {
        await deps.notifications.notify({
          userId,
          type: "payout_completed",
          title: "Payout completed",
          body: "Escrow payout has been finalized for this challenge.",
          metadata: payoutMeta,
        });
        await deps.notifications.notify({
          userId,
          type: "ranking_updated",
          title: "Ranking updated",
          body: "Leaderboard ratings were updated for this match.",
          metadata: rankingMeta,
        });
      }
    }

    return { payout, ranking };
  } catch (err) {
    if (err instanceof WalletDomainError && err.code === "fraud_payout_blocked") {
      const ch = await deps.challenges.getChallenge(input.challengeId);
      const details = err.details as Record<string, unknown> | undefined;
      for (const userId of [ch.creatorPartyId, ch.opponentPartyId] as const) {
        await deps.notifications.notify({
          userId,
          type: "fraud_hold",
          title: "Payout on hold",
          body: "Automatic payout is blocked pending fraud review.",
          metadata: { challengeId: ch.id, fraud: details },
        });
      }
    }
    throw err;
  }
}
