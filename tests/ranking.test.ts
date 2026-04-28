import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { SchedulingService } from "../src/scheduling/service.js";
import { InMemoryResultsRepository } from "../src/results/repository.js";
import { ResultsService } from "../src/results/service.js";
import { InMemoryCheckinRepository } from "../src/checkin/repository.js";
import { CheckinService } from "../src/checkin/service.js";
import { InMemoryVenueLocationProvider } from "../src/checkin/venueProvider.js";
import { InMemoryFraudRepository } from "../src/fraud/repository.js";
import { FraudService } from "../src/fraud/service.js";
import { InMemoryRankingRepository } from "../src/ranking/repository.js";
import { RankingService } from "../src/ranking/service.js";
import { DEFAULT_ELO, computeEloUpdate, expectedScore } from "../src/ranking/model.js";
import { buildApiServer } from "../src/http/server.js";

const creatorId = "p_creator";
const opponentId = "p_opponent";
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

function futureExp(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

const slot = { startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" };

async function lockBoth(challenges: ChallengeService, id: string) {
  await challenges.recordPartyFundsLocked(id, system, "creator");
  await challenges.recordPartyFundsLocked(id, system, "opponent");
}

async function driveToConfirmed(args: {
  challenges: ChallengeService;
  scheduling: SchedulingService;
  results: ResultsService;
  chId: string;
  winnerPartyId?: string;
}) {
  const { challenges, scheduling, results, chId, winnerPartyId = creatorId } = args;
  await challenges.patchVenue(chId, admin, "venue_test");
  const view = await scheduling.proposeSlots({
    challengeId: chId,
    actor: { kind: "party", partyId: creatorId },
    slots: [slot],
    expiresAt: futureExp(),
  });
  const slotId = view.activePendingProposal!.slots[0]!.id;
  await scheduling.confirmSlot({ challengeId: chId, actor: { kind: "party", partyId: creatorId }, slotId });
  await scheduling.confirmSlot({ challengeId: chId, actor: { kind: "party", partyId: opponentId }, slotId });
  await results.submitResult({
    challengeId: chId,
    actor: { kind: "party", partyId: creatorId },
    payload: { winnerPartyId },
  });
  await results.confirmResult({ challengeId: chId, actor: { kind: "party", partyId: opponentId } });
}

describe("RankingService", () => {
  let chRepo: InMemoryChallengeRepository;
  let challenges: ChallengeService;
  let scheduling: SchedulingService;
  let results: ResultsService;
  let fraudRepo: InMemoryFraudRepository;
  let fraud: FraudService;
  let rankingRepo: InMemoryRankingRepository;
  let ranking: RankingService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    challenges = new ChallengeService(chRepo);
    scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
    results = new ResultsService(new InMemoryResultsRepository(), challenges);
    fraudRepo = new InMemoryFraudRepository();
    fraud = new FraudService(fraudRepo, challenges, new CheckinService(new InMemoryCheckinRepository(), challenges, new InMemoryVenueLocationProvider()));
    rankingRepo = new InMemoryRankingRepository();
    ranking = new RankingService(rankingRepo, challenges, fraud);
  });

  async function seedConfirmedWithWinner(winner: string, sport = "chess") {
    const ch = await challenges.createChallenge({
      sport,
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await challenges.accept(ch.id, { kind: "party", partyId: opponentId });
    await lockBoth(challenges, ch.id);
    await driveToConfirmed({ challenges, scheduling, results, chId: ch.id, winnerPartyId: winner });
    return ch.id;
  }

  it("first match: symmetric ELO from defaults and increments stats", async () => {
    const id = await seedConfirmedWithWinner(creatorId, "chess");
    const out = await ranking.applyRankingFromConfirmedChallenge(id);
    expect(out.applied).toBe(true);
    expect(out.ratings.winner.elo).toBe(1516);
    expect(out.ratings.loser.elo).toBe(1484);
    expect(out.ratings.winner.wins).toBe(1);
    expect(out.ratings.winner.losses).toBe(0);
    expect(out.ratings.winner.winStreak).toBe(1);
    expect(out.ratings.loser.lossStreak).toBe(1);

    const weekly = await ranking.getLeaderboard("chess", "weekly");
    const creatorRow = weekly.find((e) => e.userId === creatorId);
    expect(creatorRow?.windowWins).toBeGreaterThanOrEqual(1);
  });

  it("upset: lower-rated side wins and gains more than favorite loses", async () => {
    const now = new Date().toISOString();
    await rankingRepo.saveUserRating({
      userId: creatorId,
      sport: "chess",
      elo: 2200,
      performanceScore: 1400,
      wins: 50,
      losses: 10,
      matchesPlayed: 60,
      winStreak: 0,
      lossStreak: 0,
      bestWinStreak: 8,
      updatedAt: now,
    });
    await rankingRepo.saveUserRating({
      userId: opponentId,
      sport: "chess",
      elo: 1400,
      performanceScore: 900,
      wins: 10,
      losses: 40,
      matchesPlayed: 50,
      winStreak: 0,
      lossStreak: 0,
      bestWinStreak: 3,
      updatedAt: now,
    });
    const id = await seedConfirmedWithWinner(opponentId, "chess");
    const out = await ranking.applyRankingFromConfirmedChallenge(id);
    const { newRa, newRb } = computeEloUpdate(1400, 2200, 1);
    expect(out.ratings.winner.elo).toBe(newRa);
    expect(out.ratings.loser.elo).toBe(newRb);
    expect(expectedScore(1400, 2200)).toBeLessThan(0.15);
  });

  it("repeat apply is idempotent", async () => {
    const id = await seedConfirmedWithWinner(creatorId, "chess");
    const a = await ranking.applyRankingFromConfirmedChallenge(id);
    const b = await ranking.applyRankingFromConfirmedChallenge(id);
    expect(a.applied).toBe(true);
    expect(b.alreadyApplied).toBe(true);
    expect(b.ratings.winner.elo).toBe(a.ratings.winner.elo);
  });

  it("rejects disputed challenge", async () => {
    const id = await seedConfirmedWithWinner(creatorId, "chess");
    const ch = await chRepo.getById(id);
    expect(ch).not.toBeNull();
    await chRepo.save({ ...ch!, state: "disputed" });
    await expect(ranking.applyRankingFromConfirmedChallenge(id)).rejects.toMatchObject({
      code: "ranking_not_eligible",
    });
  });

  it("rejects fraud-blocked clearance", async () => {
    const id = await seedConfirmedWithWinner(creatorId, "chess");
    await fraudRepo.appendEvaluation(id, {
      challengeId: id,
      evaluatedAt: new Date().toISOString(),
      version: 1,
      fraudScore: 0.9,
      signals: [],
      recommendedAction: "manual_review",
      explanation: "test",
      payoutEligible: false,
      context: "standard",
    });
    await expect(ranking.applyRankingFromConfirmedChallenge(id)).rejects.toMatchObject({
      code: "fraud_blocked_ranking",
    });
  });

  it("streak updates across two matches", async () => {
    const id1 = await seedConfirmedWithWinner(creatorId, "chess");
    await ranking.applyRankingFromConfirmedChallenge(id1);
    const id2 = await seedConfirmedWithWinner(creatorId, "chess");
    await ranking.applyRankingFromConfirmedChallenge(id2);
    const view = await ranking.getUserRankingView(creatorId, "chess");
    expect(view.rating.winStreak).toBe(2);
    expect(view.rating.bestWinStreak).toBe(2);
    expect(view.rating.wins).toBe(2);
  });

  it("leaderboard all_time orders by ELO descending for chess", async () => {
    const t = new Date().toISOString();
    await rankingRepo.saveUserRating({
      userId: "u_low",
      sport: "chess",
      elo: 1400,
      performanceScore: 990,
      wins: 1,
      losses: 0,
      matchesPlayed: 1,
      winStreak: 1,
      lossStreak: 0,
      bestWinStreak: 1,
      updatedAt: t,
    });
    await rankingRepo.saveUserRating({
      userId: "u_high",
      sport: "chess",
      elo: 1650,
      performanceScore: 1200,
      wins: 2,
      losses: 0,
      matchesPlayed: 2,
      winStreak: 2,
      lossStreak: 0,
      bestWinStreak: 2,
      updatedAt: t,
    });
    const board = await ranking.getLeaderboard("chess", "all_time");
    expect(board[0]!.userId).toBe("u_high");
    expect(board[1]!.userId).toBe("u_low");
    expect(board[0]!.rank).toBe(1);
  });

  it("non-chess sports rank by performance score", async () => {
    const id = await seedConfirmedWithWinner(creatorId, "tennis");
    const out = await ranking.applyRankingFromConfirmedChallenge(id);
    expect(out.ratings.winner.elo).toBe(1500);
    expect(out.ratings.winner.performanceScore).toBeGreaterThan(1000);
    const board = await ranking.getLeaderboard("tennis", "all_time");
    expect(board[0]!.ratingType).toBe("performance");
    expect(board[0]!.displayScore).toBe(board[0]!.performanceScore);
  });

  it("rejects team mode challenges", async () => {
    const ch = await challenges.createChallenge({
      sport: "soccer",
      mode: "team",
      creatorPartyId: "t1",
      opponentPartyId: "t2",
      stakeMinor: 100,
      currency: "USD",
    });
    const raw = await chRepo.getById(ch.id);
    expect(raw).not.toBeNull();
    await chRepo.save({
      ...raw!,
      state: "confirmed",
      result: { winnerPartyId: "t1" },
    });
    await expect(ranking.applyRankingFromConfirmedChallenge(ch.id)).rejects.toMatchObject({
      code: "team_ranking_not_supported",
    });
  });
});

describe("Ranking HTTP", () => {
  it("GET leaderboard and POST apply", async () => {
    const app = buildApiServer();
    await app.ready();
    const create = await app.inject({
      method: "POST",
      url: "/v1/challenges",
      payload: {
        sport: "pickleball",
        mode: "1v1",
        creatorPartyId: "rc",
        opponentPartyId: "ro",
        stakeMinor: 100,
        currency: "USD",
      },
    });
    const chId = (JSON.parse(create.body) as { id: string }).id;
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/accept`, payload: { actor: { kind: "party", partyId: "ro" } } });
    for (const uid of ["rc", "ro"] as const) {
      await app.inject({ method: "POST", url: "/v1/wallets", payload: { userId: uid, currency: "USD" } });
      await app.inject({
        method: "POST",
        url: `/v1/wallets/${uid}/credit`,
        payload: { amountMinor: 500, currency: "USD", idempotencyKey: `rk-${uid}` },
      });
    }
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "rc", idempotencyKey: "a" } });
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "ro", idempotencyKey: "b" } });
    await app.inject({
      method: "PATCH",
      url: `/v1/challenges/${chId}/venue`,
      payload: { actor: { kind: "admin", adminId: "a1" }, venueId: "venue_1" },
    });
    const exp = new Date(Date.now() + 86400000).toISOString();
    const prop = await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/propose`,
      payload: {
        actor: { kind: "party", partyId: "rc" },
        slots: [slot],
        expiresAt: exp,
      },
    });
    const sid = (JSON.parse(prop.body) as { activePendingProposal: { slots: { id: string }[] } }).activePendingProposal
      .slots[0]!.id;
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "rc" }, slotId: sid },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "ro" }, slotId: sid },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/submit`,
      payload: { actor: { kind: "party", partyId: "rc" }, payload: { winnerPartyId: "rc" } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/confirm`,
      payload: { actor: { kind: "party", partyId: "ro" } },
    });

    const apply = await app.inject({ method: "POST", url: `/v1/challenges/${chId}/ranking/apply`, payload: {} });
    expect(apply.statusCode).toBe(200);
    const body = JSON.parse(apply.body) as { applied: boolean; ratings: { winner: { elo: number } } };
    expect(body.applied).toBe(true);

    const lb = await app.inject({ method: "GET", url: "/v1/leaderboards/pickleball?window=all_time" });
    expect(lb.statusCode).toBe(200);
    const entries = (JSON.parse(lb.body) as { entries: { userId: string }[] }).entries;
    expect(entries.some((e) => e.userId === "rc")).toBe(true);

    await app.close();
  });
});

describe("ELO helpers", () => {
  it("expectedScore is 0.5 at equal rating", () => {
    expect(expectedScore(DEFAULT_ELO, DEFAULT_ELO)).toBeCloseTo(0.5, 5);
  });
});
