import { randomUUID } from "node:crypto";
import type { Actor } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import {
  canonicalResultFingerprint,
  assertSportResultPayload,
  ResultsDomainError,
  type ResultPayload,
  type ResultVerificationBundle,
  type ResultVerificationRound,
  type ResultsView,
} from "./model.js";
import type { ResultsRepository } from "./repository.js";

function ensureParty(challenge: { creatorPartyId: string; opponentPartyId: string }, actor: Actor): string {
  if (actor.kind !== "party") {
    throw new ResultsDomainError({ code: "forbidden_actor", message: "Only party actors may act", httpStatus: 403 });
  }
  const pid = actor.partyId;
  if (pid !== challenge.creatorPartyId && pid !== challenge.opponentPartyId) {
    throw new ResultsDomainError({ code: "forbidden_actor", message: "Actor is not on this challenge", httpStatus: 403 });
  }
  return pid;
}

function emptyBundle(challengeId: string): ResultVerificationBundle {
  return { challengeId, rounds: [] };
}

function activePendingRound(bundle: ResultVerificationBundle): ResultVerificationRound | undefined {
  return [...bundle.rounds].reverse().find((r) => r.status === "pending");
}

export class ResultsService {
  constructor(
    private readonly repo: ResultsRepository,
    private readonly challenges: ChallengeService,
  ) {}

  async getResultsView(challengeId: string): Promise<ResultsView> {
    const ch = await this.challenges.getChallenge(challengeId);
    const bundle = (await this.repo.loadBundle(challengeId)) ?? emptyBundle(challengeId);
    const active = activePendingRound(bundle);
    return {
      challengeId,
      challengeState: ch.state,
      activeRound: active,
      rounds: [...bundle.rounds].sort((a, b) => b.version - a.version),
    };
  }

  /**
   * First result submission: allowed in **`scheduled`** (or **`completed`** with no prior round — unused in MVP).
   * Persists verification round then runs `complete_match` on the challenge.
   */
  async submitResult(input: {
    challengeId: string;
    actor: Actor;
    payload: ResultPayload;
  }): Promise<ResultsView> {
    const ch = await this.challenges.getChallenge(input.challengeId);
    if (ch.state !== "scheduled" && ch.state !== "completed") {
      throw new ResultsDomainError({
        code: "challenge_not_resultable",
        message: `Results may only be submitted from scheduled or completed (got ${ch.state})`,
        httpStatus: 409,
      });
    }
    if (ch.state === "completed") {
      throw new ResultsDomainError({
        code: "challenge_not_resultable",
        message: "Result already recorded; use confirm or dispute on the pending round",
        httpStatus: 409,
      });
    }
    const partyId = ensureParty(ch, input.actor);
    assertSportResultPayload(ch.sport, input.payload);
    const fp = canonicalResultFingerprint(input.payload);
    const bundle = (await this.repo.loadBundle(input.challengeId)) ?? emptyBundle(input.challengeId);
    const version = bundle.rounds.length === 0 ? 1 : Math.max(...bundle.rounds.map((r) => r.version)) + 1;
    const round: ResultVerificationRound = {
      id: `rvr_${randomUUID()}`,
      challengeId: input.challengeId,
      version,
      submittedByPartyId: partyId,
      payload: input.payload,
      fingerprint: fp,
      submittedAt: new Date().toISOString(),
      status: "pending",
      decisions: {},
    };
    await this.challenges.completeMatch(input.challengeId, input.actor, input.payload);
    bundle.rounds.push(round);
    await this.repo.saveBundle(bundle);
    return this.getResultsView(input.challengeId);
  }

  async confirmResult(input: {
    challengeId: string;
    actor: Actor;
    note?: string;
    /** If set, must equal the active round fingerprint or confirm is rejected. */
    ackFingerprint?: string;
  }): Promise<ResultsView> {
    const ch = await this.challenges.getChallenge(input.challengeId);
    const partyId = ensureParty(ch, input.actor);
    const bundle = (await this.repo.loadBundle(input.challengeId)) ?? emptyBundle(input.challengeId);
    if (ch.state === "confirmed") {
      const prior = [...bundle.rounds].reverse().find((r) => r.decisions[partyId]?.type === "confirm");
      if (prior) {
        return this.getResultsView(input.challengeId);
      }
    }
    if (ch.state !== "completed") {
      throw new ResultsDomainError({
        code: "challenge_not_resultable",
        message: `Confirm is only valid while the challenge is completed (got ${ch.state})`,
        httpStatus: 409,
      });
    }
    const round = activePendingRound(bundle);
    if (!round) {
      throw new ResultsDomainError({ code: "no_pending_round", message: "No pending result verification", httpStatus: 409 });
    }
    if (partyId === round.submittedByPartyId) {
      throw new ResultsDomainError({
        code: "self_confirm_forbidden",
        message: "Submitting party cannot confirm its own result",
        httpStatus: 403,
      });
    }
    const existing = round.decisions[partyId];
    if (existing?.type === "confirm") {
      return this.getResultsView(input.challengeId);
    }
    if (existing) {
      throw new ResultsDomainError({ code: "already_decided", message: "Party already recorded a decision", httpStatus: 409 });
    }
    if (input.ackFingerprint !== undefined && input.ackFingerprint !== round.fingerprint) {
      throw new ResultsDomainError({
        code: "payload_mismatch",
        message: "ackFingerprint does not match the submitted result",
        httpStatus: 409,
        details: { expected: round.fingerprint },
      });
    }
    await this.challenges.confirmResult(input.challengeId, input.actor, input.note);
    round.decisions[partyId] = { type: "confirm", at: new Date().toISOString(), note: input.note };
    round.status = "confirmed";
    await this.repo.saveBundle(bundle);
    return this.getResultsView(input.challengeId);
  }

  async disputeResult(input: {
    challengeId: string;
    actor: Actor;
    reason: string;
    counterPayload?: ResultPayload;
  }): Promise<ResultsView> {
    const ch = await this.challenges.getChallenge(input.challengeId);
    const partyId = ensureParty(ch, input.actor);
    const bundle = (await this.repo.loadBundle(input.challengeId)) ?? emptyBundle(input.challengeId);
    if (ch.state === "disputed") {
      const prior = [...bundle.rounds].reverse().find((r) => r.decisions[partyId]?.type === "dispute");
      if (prior) {
        return this.getResultsView(input.challengeId);
      }
    }
    if (ch.state !== "completed") {
      throw new ResultsDomainError({
        code: "challenge_not_resultable",
        message: `Dispute is only valid while the challenge is completed (got ${ch.state})`,
        httpStatus: 409,
      });
    }
    const round = activePendingRound(bundle);
    if (!round) {
      throw new ResultsDomainError({ code: "no_pending_round", message: "No pending result verification", httpStatus: 409 });
    }
    if (partyId === round.submittedByPartyId) {
      throw new ResultsDomainError({
        code: "forbidden_actor",
        message: "Submitting party should not dispute its own submission via this flow",
        httpStatus: 403,
      });
    }
    const existing = round.decisions[partyId];
    if (existing?.type === "dispute") {
      return this.getResultsView(input.challengeId);
    }
    if (existing) {
      throw new ResultsDomainError({ code: "already_decided", message: "Party already recorded a decision", httpStatus: 409 });
    }
    if (input.counterPayload) {
      assertSportResultPayload(ch.sport, input.counterPayload);
    }
    await this.challenges.dispute(input.challengeId, input.actor, input.reason);
    round.decisions[partyId] = {
      type: "dispute",
      at: new Date().toISOString(),
      reason: input.reason,
      counterPayload: input.counterPayload,
    };
    round.status = "disputed";
    await this.repo.saveBundle(bundle);
    return this.getResultsView(input.challengeId);
  }
}
