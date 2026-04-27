import type { Actor, Challenge } from "../challenges/model.js";
import type { ChallengeService, CreateChallengeInput } from "../challenges/service.js";
import type { FraudService } from "../fraud/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { RankingService } from "../ranking/service.js";
import type { ResultsService } from "../results/service.js";
import type { SchedulingService } from "../scheduling/service.js";
import type { WalletService } from "../wallet/service.js";

/**
 * Shared wiring for application/orchestration flows.
 * Flows only coordinate calls; domain rules stay inside each module.
 */
export type ApplicationDeps = {
  challenges: ChallengeService;
  wallet: WalletService;
  scheduling: SchedulingService;
  results: ResultsService;
  fraud: FraudService;
  ranking: RankingService;
  notifications: NotificationService;
};

/** Challenge lifecycle flows compose these services plus notifications. */
export type CreateChallengeFlowInput = CreateChallengeInput & {
  /** When set, `patchVenue` runs as the creator party after create. */
  venueId?: string;
};

export type AcceptAndFundChallengeFlowInput = {
  challengeId: string;
  /** Party that accepts (must be opponent while `pending`). */
  opponentPartyId: string;
  /** Pass through to `WalletService.lockChallengeStake` for replay-safe locks. */
  idempotencyKeys: { creator: string; opponent: string };
};

export type ConfirmScheduleFlowInput = {
  challengeId: string;
  actor: Actor;
  slotId: string;
};

export type PayoutAndRankFlowInput = {
  challengeId: string;
  winnerUserId: string;
  platformFeeMinor?: number;
  idempotencyKey: string;
};

export function counterpartyPartyId(
  ch: Pick<Challenge, "creatorPartyId" | "opponentPartyId">,
  partyId: string,
): string | null {
  if (partyId === ch.creatorPartyId) return ch.opponentPartyId;
  if (partyId === ch.opponentPartyId) return ch.creatorPartyId;
  return null;
}
