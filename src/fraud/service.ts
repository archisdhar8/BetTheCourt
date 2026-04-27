import type { Challenge } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import type { CheckinService } from "../checkin/service.js";
import {
  evaluateDeterministicRules,
  extractWinnerPartyId,
  samePair,
  FraudDomainError,
  type ChallengeHistorySnapshot,
  type FraudEvaluationContext,
  type FraudEvaluationRecord,
  type RuleEngineInput,
} from "./model.js";
import type { FraudRepository } from "./repository.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function pairMatchesChallenge(ch: Challenge, s: ChallengeHistorySnapshot): boolean {
  return samePair(ch.creatorPartyId, ch.opponentPartyId, s.creatorPartyId, s.opponentPartyId);
}

function countPairPriorMatches(ch: Challenge, snapshots: ChallengeHistorySnapshot[]): number {
  return snapshots.filter((s) => s.id !== ch.id && pairMatchesChallenge(ch, s)).length;
}

function detectFastRepeat(ch: Challenge, snapshots: ChallengeHistorySnapshot[]): boolean {
  const times = snapshots
    .filter((s) => pairMatchesChallenge(ch, s))
    .map((s) => new Date(s.createdAt).getTime());
  times.push(new Date(ch.createdAt).getTime());
  times.sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    if (times[i]! - times[i - 1]! <= SIX_HOURS_MS) return true;
  }
  return false;
}

function computeSameWinnerStreak(ch: Challenge, snapshots: ChallengeHistorySnapshot[]): number {
  const currentWinner = extractWinnerPartyId(
    ch.result as Record<string, unknown> | undefined,
    ch.creatorPartyId,
    ch.opponentPartyId,
  );
  if (!currentWinner) return 0;
  const priors = snapshots
    .filter(
      (s) =>
        s.id !== ch.id &&
        pairMatchesChallenge(ch, s) &&
        (s.state === "confirmed" || s.state === "paid_out") &&
        Boolean(s.winnerPartyId),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  let streak = 1;
  for (const s of priors) {
    if (s.winnerPartyId !== currentWinner) break;
    streak++;
  }
  return streak;
}

export class FraudService {
  constructor(
    private readonly repo: FraudRepository,
    private readonly challenges: ChallengeService,
    private readonly checkin: CheckinService,
  ) {}

  async getLatestEvaluation(challengeId: string): Promise<FraudEvaluationRecord | null> {
    return this.repo.getLatestEvaluation(challengeId);
  }

  /** When a fraud evaluation exists and `payoutEligible` is false, ranking integration should skip the challenge. */
  async blocksRankingIntegration(challengeId: string): Promise<boolean> {
    const latest = await this.getLatestEvaluation(challengeId);
    return latest !== null && !latest.payoutEligible;
  }

  /**
   * Wallet path: run the same rules as `evaluate` but **do not** append a row.
   * Throws `FraudDomainError` when payout should not proceed automatically.
   */
  async assertPayoutAllowed(challengeId: string): Promise<FraudEvaluationRecord> {
    const priorLen = (await this.repo.listEvaluations(challengeId)).length;
    const rec = await this.buildEvaluationRecord(challengeId, "payout_attempt", priorLen, false);
    if (!rec.payoutEligible) {
      throw new FraudDomainError({
        code: "payout_blocked",
        message: "Automatic payout blocked by fraud risk policy",
        httpStatus: 409,
        details: {
          fraudScore: rec.fraudScore,
          signals: rec.signals,
          recommendedAction: rec.recommendedAction,
        },
      });
    }
    return rec;
  }

  /**
   * Persist an evaluation row (audit / ops). Scores are deterministic for identical inputs;
   * `version` increments on each call.
   */
  async evaluate(input: {
    challengeId: string;
    context?: FraudEvaluationContext;
    emitPlaceholderSignals?: boolean;
  }): Promise<FraudEvaluationRecord> {
    const prior = await this.repo.listEvaluations(input.challengeId);
    const context: FraudEvaluationContext = input.context ?? "standard";
    const rec = await this.buildEvaluationRecord(
      input.challengeId,
      context,
      prior.length,
      input.emitPlaceholderSignals === true,
    );
    await this.repo.appendEvaluation(input.challengeId, rec);
    return rec;
  }

  private async buildEvaluationRecord(
    challengeId: string,
    context: FraudEvaluationContext,
    priorEvaluationCount: number,
    emitPlaceholderSignals: boolean,
  ): Promise<FraudEvaluationRecord> {
    const ch = await this.challenges.getChallenge(challengeId);
    const [checkView, snapshots, cStats, oStats] = await Promise.all([
      this.checkin.getCheckInStatus(challengeId),
      this.repo.listSnapshots(),
      this.repo.getPartyStats(ch.creatorPartyId),
      this.repo.getPartyStats(ch.opponentPartyId),
    ]);

    const bothPartiesValidCheckin = checkView.bothCheckedInValid;
    const creatorCheckinValid = checkView.creator?.valid === true;
    const opponentCheckinValid = checkView.opponent?.valid === true;
    const hasAnyCheckinRecord = checkView.creator !== null || checkView.opponent !== null;
    const hasConfirmedResultPath = ch.state === "confirmed" || ch.state === "paid_out";

    const ruleInput: RuleEngineInput = {
      challenge: ch,
      context,
      priorEvaluationCount,
      bothPartiesValidCheckin,
      creatorCheckinValid,
      opponentCheckinValid,
      hasAnyCheckinRecord,
      hasConfirmedResultPath,
      pairPriorMatchCount: countPairPriorMatches(ch, snapshots),
      pairFastRepeatDetected: detectFastRepeat(ch, snapshots),
      sameWinnerStreakLength: computeSameWinnerStreak(ch, snapshots),
      creatorStats: cStats,
      opponentStats: oStats,
      emitPlaceholderSignals,
    };

    const { fraudScore, signals, recommendedAction, explanation, payoutEligible } =
      evaluateDeterministicRules(ruleInput);

    return {
      challengeId,
      evaluatedAt: new Date().toISOString(),
      version: priorEvaluationCount + 1,
      fraudScore,
      signals,
      recommendedAction,
      explanation,
      payoutEligible,
      context,
    };
  }
}
