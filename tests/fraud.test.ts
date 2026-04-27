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
import { InMemoryWalletRepository } from "../src/wallet/repository.js";
import { WalletService } from "../src/wallet/service.js";
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
}) {
  const { challenges, scheduling, results, chId } = args;
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
    payload: { winnerPartyId: creatorId },
  });
  await results.confirmResult({ challengeId: chId, actor: { kind: "party", partyId: opponentId } });
}

describe("FraudService", () => {
  let chRepo: InMemoryChallengeRepository;
  let challenges: ChallengeService;
  let scheduling: SchedulingService;
  let results: ResultsService;
  let checkin: CheckinService;
  let fraudRepo: InMemoryFraudRepository;
  let fraud: FraudService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    challenges = new ChallengeService(chRepo);
    scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
    results = new ResultsService(new InMemoryResultsRepository(), challenges);
    checkin = new CheckinService(new InMemoryCheckinRepository(), challenges, new InMemoryVenueLocationProvider());
    fraudRepo = new InMemoryFraudRepository();
    fraud = new FraudService(fraudRepo, challenges, checkin);
  });

  async function seedConfirmedChallenge() {
    const ch = await challenges.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await challenges.accept(ch.id, { kind: "party", partyId: opponentId });
    await lockBoth(challenges, ch.id);
    await driveToConfirmed({ challenges, scheduling, results, chId: ch.id });
    return ch.id;
  }

  it("clean match: low statistical risk, allow, payoutEligible", async () => {
    const id = await seedConfirmedChallenge();
    const ev = await fraud.evaluate({ challengeId: id, context: "standard" });
    expect(ev.fraudScore).toBeLessThan(0.22);
    expect(ev.recommendedAction).toBe("allow");
    expect(ev.payoutEligible).toBe(true);
    expect(ev.signals.some((s) => s.id === "repeated_same_pair_matches")).toBe(false);
    expect(ev.signals.some((s) => s.id === "high_dispute_rate")).toBe(false);
  });

  it("no-checkin confirmed match: presence-related signals, still allow payout by default", async () => {
    const id = await seedConfirmedChallenge();
    const ev = await fraud.evaluate({ challengeId: id, context: "standard" });
    const ids = ev.signals.map((s) => s.id);
    expect(ids).toContain("no_valid_checkins");
    expect(ids).toContain("result_without_presence_confidence");
    expect(ev.payoutEligible).toBe(true);
  });

  it("repeated same pair elevates score and triggers signal", async () => {
    const id = await seedConfirmedChallenge();
    const base = new Date("2026-01-01T12:00:00.000Z").getTime();
    for (let i = 0; i < 8; i++) {
      await fraudRepo.addSnapshot({
        id: `prior_${i}`,
        creatorPartyId: creatorId,
        opponentPartyId: opponentId,
        createdAt: new Date(base + i * 86400000).toISOString(),
        state: "paid_out",
        winnerPartyId: creatorId,
      });
    }
    const ev = await fraud.evaluate({ challengeId: id, context: "standard" });
    expect(ev.signals.some((s) => s.id === "repeated_same_pair_matches")).toBe(true);
    expect(ev.fraudScore).toBeGreaterThanOrEqual(0.28);
  });

  it("dispute-heavy party stats trigger high_dispute_rate", async () => {
    const id = await seedConfirmedChallenge();
    fraudRepo.putPartyStats({
      partyId: creatorId,
      disputeCount: 12,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 8,
    });
    fraudRepo.putPartyStats({
      partyId: opponentId,
      disputeCount: 0,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 10,
    });
    const ev = await fraud.evaluate({ challengeId: id, context: "standard" });
    expect(ev.signals.some((s) => s.id === "high_dispute_rate")).toBe(true);
  });

  it("reevaluate is deterministic for same inputs (scores match; version increments)", async () => {
    const id = await seedConfirmedChallenge();
    const a = await fraud.evaluate({ challengeId: id, context: "standard" });
    const b = await fraud.evaluate({ challengeId: id, context: "standard" });
    expect(a.fraudScore).toBe(b.fraudScore);
    const wa = a.signals
      .filter((s) => s.weight > 0)
      .map((s) => s.id)
      .sort();
    const wb = b.signals
      .filter((s) => s.weight > 0)
      .map((s) => s.id)
      .sort();
    expect(wa).toEqual(wb);
    expect(b.version).toBe(a.version + 1);
  });

  it("emitPlaceholderSignals adds zero-weight home_court placeholder", async () => {
    const id = await seedConfirmedChallenge();
    const ev = await fraud.evaluate({ challengeId: id, emitPlaceholderSignals: true });
    expect(ev.signals.some((s) => s.id === "home_court_bias_pattern")).toBe(true);
    const ph = ev.signals.find((s) => s.id === "home_court_bias_pattern")!;
    expect(ph.weight).toBe(0);
  });

  it("wallet payout blocked when fraud score in hold band", async () => {
    const wRepo = new InMemoryWalletRepository();
    const fraudRepo2 = new InMemoryFraudRepository();
    const challenges2 = new ChallengeService(new InMemoryChallengeRepository());
    const scheduling2 = new SchedulingService(new InMemorySchedulingRepository(), challenges2);
    const results2 = new ResultsService(new InMemoryResultsRepository(), challenges2);
    const checkin2 = new CheckinService(new InMemoryCheckinRepository(), challenges2, new InMemoryVenueLocationProvider());
    const fraud2 = new FraudService(fraudRepo2, challenges2, checkin2);
    const wallet = new WalletService(wRepo, challenges2, fraud2);

    await wallet.createWallet({ userId: creatorId, currency: "USD" });
    await wallet.createWallet({ userId: opponentId, currency: "USD" });
    await wallet.creditWallet({
      userId: creatorId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "fc",
    });
    await wallet.creditWallet({
      userId: opponentId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "fo",
    });

    const ch = await challenges2.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await challenges2.accept(ch.id, { kind: "party", partyId: opponentId });
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "lc" });
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: opponentId, idempotencyKey: "lo" });
    await driveToConfirmed({ challenges: challenges2, scheduling: scheduling2, results: results2, chId: ch.id });

    const base = new Date("2026-01-01T12:00:00.000Z").getTime();
    for (let i = 0; i < 8; i++) {
      await fraudRepo2.addSnapshot({
        id: `prior_${i}`,
        creatorPartyId: creatorId,
        opponentPartyId: opponentId,
        createdAt: new Date(base + i * 86400000).toISOString(),
        state: "paid_out",
        winnerPartyId: creatorId,
      });
    }
    fraudRepo2.putPartyStats({
      partyId: creatorId,
      disputeCount: 15,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 10,
    });
    fraudRepo2.putPartyStats({
      partyId: opponentId,
      disputeCount: 15,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 10,
    });

    await expect(
      wallet.payoutChallengeEscrow({
        challengeId: ch.id,
        winnerUserId: creatorId,
        platformFeeMinor: 0,
        idempotencyKey: "pay-fraud",
      }),
    ).rejects.toMatchObject({ code: "fraud_payout_blocked" });
  });
});

describe("Fraud HTTP", () => {
  it("GET /fraud returns latest after evaluate", async () => {
    const app = buildApiServer();
    await app.ready();
    const create = await app.inject({
      method: "POST",
      url: "/v1/challenges",
      payload: {
        sport: "pickleball",
        mode: "1v1",
        creatorPartyId: "fc",
        opponentPartyId: "fo",
        stakeMinor: 100,
        currency: "USD",
      },
    });
    const chId = (JSON.parse(create.body) as { id: string }).id;
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/accept`, payload: { actor: { kind: "party", partyId: "fo" } } });
    for (const uid of ["fc", "fo"] as const) {
      await app.inject({ method: "POST", url: "/v1/wallets", payload: { userId: uid, currency: "USD" } });
      await app.inject({
        method: "POST",
        url: `/v1/wallets/${uid}/credit`,
        payload: { amountMinor: 500, currency: "USD", idempotencyKey: `x-${uid}` },
      });
    }
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "fc", idempotencyKey: "a" } });
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "fo", idempotencyKey: "b" } });
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
        actor: { kind: "party", partyId: "fc" },
        slots: [slot],
        expiresAt: exp,
      },
    });
    const sid = (JSON.parse(prop.body) as { activePendingProposal: { slots: { id: string }[] } }).activePendingProposal
      .slots[0]!.id;
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "fc" }, slotId: sid },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "fo" }, slotId: sid },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/submit`,
      payload: { actor: { kind: "party", partyId: "fc" }, payload: { w: 1 } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/confirm`,
      payload: { actor: { kind: "party", partyId: "fo" } },
    });

    const ev = await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/fraud/evaluate`,
      payload: { context: "standard" },
    });
    expect(ev.statusCode).toBe(200);

    const get = await app.inject({ method: "GET", url: `/v1/challenges/${chId}/fraud` });
    expect(get.statusCode).toBe(200);
    const body = JSON.parse(get.body) as { latest: { fraudScore: number } | null };
    expect(body.latest?.fraudScore).toBeDefined();

    await app.close();
  });
});
