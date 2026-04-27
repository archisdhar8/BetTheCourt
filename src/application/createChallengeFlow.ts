import type { ApplicationDeps, CreateChallengeFlowInput } from "./model.js";

/**
 * Creates a challenge, optionally attaches a venue, notifies the opponent.
 * Does not validate sport/mode beyond `ChallengeService.createChallenge`.
 */
export async function createChallengeFlow(deps: ApplicationDeps, input: CreateChallengeFlowInput) {
  const { venueId, ...rest } = input;
  const challenge = await deps.challenges.createChallenge({
    ...rest,
    initialState: rest.initialState ?? "pending",
  });

  let ch = challenge;
  if (venueId) {
    ch = await deps.challenges.patchVenue(ch.id, { kind: "party", partyId: rest.creatorPartyId }, venueId);
  }

  await deps.notifications.notify({
    userId: ch.opponentPartyId,
    type: "challenge_received",
    title: "New challenge",
    body: `You received a challenge in ${ch.sport}.`,
    metadata: { challengeId: ch.id, sport: ch.sport, creatorPartyId: ch.creatorPartyId },
  });

  return { challenge: ch };
}
