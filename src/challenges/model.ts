/** MVP lifecycle states for a money-backed sports challenge. */
export const CHALLENGE_STATES = [
  "draft",
  "pending",
  "accepted",
  "funded",
  "scheduled",
  "completed",
  "confirmed",
  "disputed",
  "paid_out",
  "refunded",
  "cancelled",
] as const;

export type ChallengeState = (typeof CHALLENGE_STATES)[number];

/** Who initiated an action affecting transitions. */
export type ActorKind = "creator" | "opponent" | "system" | "admin";

export type Actor =
  | { kind: "party"; partyId: string }
  | { kind: "system" }
  | { kind: "admin"; adminId: string };

export type ChallengeMode = "1v1" | "team";

export type ScheduleProposal = {
  startAt: string;
  endAt: string;
  note?: string;
};

export type TransitionRecord = {
  id: string;
  at: string;
  from: ChallengeState;
  to: ChallengeState;
  actor: Actor;
  /** Resolved role for party actors (creator/opponent); undefined for system/admin. */
  role?: ActorKind;
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type Challenge = {
  id: string;
  sport: string;
  mode: ChallengeMode;
  creatorPartyId: string;
  opponentPartyId: string;
  stakeMinor: number;
  currency: string;
  state: ChallengeState;
  /** Wallet / escrow confirmed stake lock for creator (accepted → funded when both sides true). */
  creatorFundsLocked?: boolean;
  /** Wallet / escrow confirmed stake lock for opponent. */
  opponentFundsLocked?: boolean;
  venueId?: string;
  scheduleProposal?: ScheduleProposal;
  /** Party ids that have confirmed the current schedule proposal (MVP: need both). */
  scheduleConfirmations?: string[];
  /** Who recorded completion (result submission). */
  completedByPartyId?: string;
  /** Opaque result payload (scores, format, etc.). */
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  transitions: TransitionRecord[];
};

export type ChallengeErrorCode =
  | "not_found"
  | "invalid_transition"
  | "forbidden_actor"
  | "invalid_payload"
  | "payout_blocked"
  | "ranking_blocked";

export class ChallengeDomainError extends Error {
  readonly code: ChallengeErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(input: { code: ChallengeErrorCode; message: string; httpStatus?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
    this.name = "ChallengeDomainError";
  }
}

/** Payout (ledger) must only run from `confirmed` (not `disputed`). */
export function canInitiatePayout(state: ChallengeState): boolean {
  return state === "confirmed";
}

/** Rankings should not advance while disputed or before confirmation. */
export function canRecordRanking(state: ChallengeState): boolean {
  return state === "confirmed" || state === "paid_out";
}

export function isTerminalState(state: ChallengeState): boolean {
  return state === "paid_out" || state === "refunded" || state === "cancelled";
}

export function resolveActorRole(challenge: Challenge, actor: Actor): ActorKind | null {
  if (actor.kind === "system") return "system";
  if (actor.kind === "admin") return "admin";
  if (actor.partyId === challenge.creatorPartyId) return "creator";
  if (actor.partyId === challenge.opponentPartyId) return "opponent";
  return null;
}

export function bothSidesFundsLocked(challenge: Challenge): boolean {
  return Boolean(challenge.creatorFundsLocked ?? false) && Boolean(challenge.opponentFundsLocked ?? false);
}
