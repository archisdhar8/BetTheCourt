import { bothSidesFundsLocked } from "../challenges/model.js";
import type { ApplicationDeps, AcceptAndFundChallengeFlowInput } from "./model.js";

/**
 * Opponent accepts, both stakes lock via wallet, challenge may become `funded`.
 * Emits `challenge_accepted` after accept and `funds_locked` once both sides are locked (funded).
 */
export async function acceptAndFundChallengeFlow(deps: ApplicationDeps, input: AcceptAndFundChallengeFlowInput) {
  const actor = { kind: "party" as const, partyId: input.opponentPartyId };
  let ch = await deps.challenges.accept(input.challengeId, actor);

  await deps.notifications.notify({
    userId: ch.creatorPartyId,
    type: "challenge_accepted",
    title: "Challenge accepted",
    body: "Your opponent accepted the challenge.",
    metadata: { challengeId: ch.id },
  });
  await deps.notifications.notify({
    userId: ch.opponentPartyId,
    type: "challenge_accepted",
    title: "Challenge accepted",
    body: "You accepted the challenge.",
    metadata: { challengeId: ch.id },
  });

  const afterCreator = await deps.wallet.lockChallengeStake({
    challengeId: input.challengeId,
    userId: ch.creatorPartyId,
    idempotencyKey: input.idempotencyKeys.creator,
  });
  ch = afterCreator.challenge;

  const afterOpponent = await deps.wallet.lockChallengeStake({
    challengeId: input.challengeId,
    userId: ch.opponentPartyId,
    idempotencyKey: input.idempotencyKeys.opponent,
  });
  ch = afterOpponent.challenge;

  if (ch.state === "funded" || bothSidesFundsLocked(ch)) {
    await deps.notifications.notify({
      userId: ch.creatorPartyId,
      type: "funds_locked",
      title: "Funds locked",
      body: "Both stakes are locked; the challenge is funded.",
      metadata: { challengeId: ch.id },
    });
    await deps.notifications.notify({
      userId: ch.opponentPartyId,
      type: "funds_locked",
      title: "Funds locked",
      body: "Both stakes are locked; the challenge is funded.",
      metadata: { challengeId: ch.id },
    });
  }

  return {
    challenge: ch,
    creatorLock: afterCreator,
    opponentLock: afterOpponent,
  };
}
