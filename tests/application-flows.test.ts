import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { InMemoryWalletRepository } from "../src/wallet/repository.js";
import { WalletService } from "../src/wallet/service.js";
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
import { InMemoryNotificationsRepository } from "../src/notifications/repository.js";
import { NotificationService } from "../src/notifications/service.js";
import { SchedulingDomainError } from "../src/scheduling/model.js";
import { WalletDomainError } from "../src/wallet/model.js";
import {
  acceptAndFundChallengeFlow,
  confirmScheduleFlow,
  createChallengeFlow,
  payoutAndRankFlow,
  submitResultFlow,
  confirmResultFlow,
  disputeResultFlow,
} from "../src/application/index.js";
import type { ApplicationDeps } from "../src/application/model.js";

const creatorId = "p_creator";
const opponentId = "p_opponent";
const admin = { kind: "admin" as const, adminId: "adm1" };

function futureExp(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

const slot = { startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" };

function buildHarness(): { deps: ApplicationDeps; fraudRepo: InMemoryFraudRepository } {
  const challengeRepo = new InMemoryChallengeRepository();
  const challenges = new ChallengeService(challengeRepo);
  const resultsRepo = new InMemoryResultsRepository();
  const results = new ResultsService(resultsRepo, challenges);
  const checkin = new CheckinService(
    new InMemoryCheckinRepository(),
    challenges,
    new InMemoryVenueLocationProvider(),
  );
  const fraudRepo = new InMemoryFraudRepository();
  const fraud = new FraudService(fraudRepo, challenges, checkin);
  const ranking = new RankingService(new InMemoryRankingRepository(), challenges, fraud);
  const wallet = new WalletService(new InMemoryWalletRepository(), challenges, fraud);
  const scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
  const notifications = new NotificationService(new InMemoryNotificationsRepository());
  const deps: ApplicationDeps = { challenges, wallet, scheduling, results, fraud, ranking, notifications };
  return { deps, fraudRepo };
}

async function ensureWallet(deps: ApplicationDeps, userId: string) {
  try {
    await deps.wallet.createWallet({ userId, currency: "USD" });
  } catch (e) {
    if (e instanceof WalletDomainError && e.code === "invalid_payload") return;
    throw e;
  }
}

async function seedFundedChallenge(deps: ApplicationDeps, stakeMinor = 1000) {
  await ensureWallet(deps, creatorId);
  await ensureWallet(deps, opponentId);
  await deps.wallet.creditWallet({
    userId: creatorId,
    amountMinor: stakeMinor * 5,
    currency: "USD",
    idempotencyKey: `app-c-${stakeMinor}`,
  });
  await deps.wallet.creditWallet({
    userId: opponentId,
    amountMinor: stakeMinor * 5,
    currency: "USD",
    idempotencyKey: `app-o-${stakeMinor}`,
  });
  const { challenge } = await createChallengeFlow(deps, {
    sport: "tennis",
    mode: "1v1",
    creatorPartyId: creatorId,
    opponentPartyId: opponentId,
    stakeMinor,
    currency: "USD",
    venueId: "venue_flow",
  });
  await acceptAndFundChallengeFlow(deps, {
    challengeId: challenge.id,
    opponentPartyId: opponentId,
    idempotencyKeys: { creator: `lock-c-${challenge.id}`, opponent: `lock-o-${challenge.id}` },
  });
  return challenge.id;
}

async function driveToScheduled(deps: ApplicationDeps, challengeId: string) {
  const view = await deps.scheduling.proposeSlots({
    challengeId,
    actor: { kind: "party", partyId: creatorId },
    slots: [slot],
    expiresAt: futureExp(),
  });
  const slotId = view.activePendingProposal!.slots[0]!.id;
  await confirmScheduleFlow(deps, {
    challengeId,
    actor: { kind: "party", partyId: creatorId },
    slotId,
  });
  await confirmScheduleFlow(deps, {
    challengeId,
    actor: { kind: "party", partyId: opponentId },
    slotId,
  });
}

describe("application flows", () => {
  let deps: ApplicationDeps;
  let fraudRepo: InMemoryFraudRepository;

  beforeEach(() => {
    const h = buildHarness();
    deps = h.deps;
    fraudRepo = h.fraudRepo;
  });

  it("createChallengeFlow notifies opponent and optionally sets venue", async () => {
    const { challenge } = await createChallengeFlow(deps, {
      sport: "pickleball",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 500,
      currency: "USD",
      venueId: "v1",
    });
    expect(challenge.state).toBe("pending");
    expect(challenge.venueId).toBe("v1");

    const inbox = await deps.notifications.listNotifications(opponentId, {});
    expect(inbox.notifications.some((n) => n.type === "challenge_received")).toBe(true);
  });

  it("acceptAndFundChallengeFlow locks both sides and emits acceptance and funds notifications", async () => {
    await deps.wallet.createWallet({ userId: creatorId, currency: "USD" });
    await deps.wallet.createWallet({ userId: opponentId, currency: "USD" });
    await deps.wallet.creditWallet({
      userId: creatorId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "af-c",
    });
    await deps.wallet.creditWallet({
      userId: opponentId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "af-o",
    });

    const { challenge: created } = await createChallengeFlow(deps, {
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });

    const { challenge } = await acceptAndFundChallengeFlow(deps, {
      challengeId: created.id,
      opponentPartyId: opponentId,
      idempotencyKeys: { creator: "idem-lc", opponent: "idem-lo" },
    });
    expect(challenge.state).toBe("funded");

    const creatorInbox = await deps.notifications.listNotifications(creatorId, {});
    const opponentInbox = await deps.notifications.listNotifications(opponentId, {});
    expect(creatorInbox.notifications.filter((n) => n.type === "challenge_accepted").length).toBeGreaterThanOrEqual(1);
    expect(creatorInbox.notifications.filter((n) => n.type === "funds_locked").length).toBe(1);
    expect(opponentInbox.notifications.filter((n) => n.type === "funds_locked").length).toBe(1);
  });

  it("acceptAndFundChallengeFlow surfaces wallet errors without funds_locked notifications", async () => {
    await deps.wallet.createWallet({ userId: creatorId, currency: "USD" });
    await deps.wallet.createWallet({ userId: opponentId, currency: "USD" });
    await deps.wallet.creditWallet({
      userId: creatorId,
      amountMinor: 500,
      currency: "USD",
      idempotencyKey: "poor-c",
    });
    await deps.wallet.creditWallet({
      userId: opponentId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "poor-o",
    });

    const { challenge: created } = await createChallengeFlow(deps, {
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });

    await expect(
      acceptAndFundChallengeFlow(deps, {
        challengeId: created.id,
        opponentPartyId: opponentId,
        idempotencyKeys: { creator: "x1", opponent: "x2" },
      }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });

    const creatorInbox = await deps.notifications.listNotifications(creatorId, {});
    expect(creatorInbox.notifications.some((n) => n.type === "funds_locked")).toBe(false);
  });

  it("confirmScheduleFlow is blocked until funded", async () => {
    await deps.wallet.createWallet({ userId: creatorId, currency: "USD" });
    await deps.wallet.createWallet({ userId: opponentId, currency: "USD" });
    await deps.wallet.creditWallet({
      userId: creatorId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "sch-c",
    });
    await deps.wallet.creditWallet({
      userId: opponentId,
      amountMinor: 5000,
      currency: "USD",
      idempotencyKey: "sch-o",
    });

    const { challenge: created } = await createChallengeFlow(deps, {
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await deps.challenges.accept(created.id, { kind: "party", partyId: opponentId });
    await deps.challenges.patchVenue(created.id, admin, "venue_x");

    const view = await deps.scheduling.proposeSlots({
      challengeId: created.id,
      actor: { kind: "party", partyId: creatorId },
      slots: [slot],
      expiresAt: futureExp(),
    });
    const slotId = view.activePendingProposal!.slots[0]!.id;

    await expect(
      confirmScheduleFlow(deps, {
        challengeId: created.id,
        actor: { kind: "party", partyId: creatorId },
        slotId,
      }),
    ).rejects.toBeInstanceOf(SchedulingDomainError);

    await deps.wallet.lockChallengeStake({
      challengeId: created.id,
      userId: creatorId,
      idempotencyKey: "pf1",
    });
    await deps.wallet.lockChallengeStake({
      challengeId: created.id,
      userId: opponentId,
      idempotencyKey: "pf2",
    });

    await confirmScheduleFlow(deps, {
      challengeId: created.id,
      actor: { kind: "party", partyId: creatorId },
      slotId,
    });
    const out = await confirmScheduleFlow(deps, {
      challengeId: created.id,
      actor: { kind: "party", partyId: opponentId },
      slotId,
    });
    expect(out.challenge.state).toBe("scheduled");

    const nCreator = await deps.notifications.listNotifications(creatorId, {});
    expect(nCreator.notifications.filter((n) => n.type === "schedule_confirmed").length).toBe(1);
  });

  it("submit and confirm result flows emit in-app notifications", async () => {
    const chId = await seedFundedChallenge(deps);
    await driveToScheduled(deps, chId);

    await submitResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      payload: { winnerPartyId: creatorId },
    });
    const afterSubmit = await deps.notifications.listNotifications(opponentId, {});
    expect(afterSubmit.notifications.some((n) => n.type === "result_submitted")).toBe(true);

    await confirmResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: opponentId },
    });
    const creatorInbox = await deps.notifications.listNotifications(creatorId, {});
    expect(creatorInbox.notifications.some((n) => n.type === "result_confirmed")).toBe(true);
  });

  it("disputeResultFlow notifies both parties", async () => {
    const chId = await seedFundedChallenge(deps);
    await driveToScheduled(deps, chId);
    await submitResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      payload: { winnerPartyId: creatorId },
    });
    await disputeResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: opponentId },
      reason: "score mismatch",
    });

    const c = await deps.notifications.listNotifications(creatorId, {});
    const o = await deps.notifications.listNotifications(opponentId, {});
    expect(c.notifications.filter((n) => n.type === "dispute_opened").length).toBe(1);
    expect(o.notifications.filter((n) => n.type === "dispute_opened").length).toBe(1);
  });

  it("payoutAndRankFlow pays out, ranks, and notifies; fraud hold rethrows", async () => {
    const chId = await seedFundedChallenge(deps);
    await driveToScheduled(deps, chId);
    await submitResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      payload: { winnerPartyId: creatorId },
    });
    await confirmResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: opponentId },
    });

    const out = await payoutAndRankFlow(deps, {
      challengeId: chId,
      winnerUserId: creatorId,
      idempotencyKey: "pay-app-1",
    });
    expect(out.payout.challenge.state).toBe("paid_out");
    expect(out.ranking.applied).toBe(true);

    const creatorInbox = await deps.notifications.listNotifications(creatorId, {});
    expect(creatorInbox.notifications.some((n) => n.type === "payout_completed")).toBe(true);
    expect(creatorInbox.notifications.some((n) => n.type === "ranking_updated")).toBe(true);

    const base = new Date("2026-01-01T12:00:00.000Z").getTime();
    for (let i = 0; i < 8; i++) {
      await fraudRepo.addSnapshot({
        id: `prior_app_${i}`,
        creatorPartyId: creatorId,
        opponentPartyId: opponentId,
        createdAt: new Date(base + i * 86400000).toISOString(),
        state: "paid_out",
        winnerPartyId: creatorId,
      });
    }
    fraudRepo.putPartyStats({
      partyId: creatorId,
      disputeCount: 15,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 10,
    });
    fraudRepo.putPartyStats({
      partyId: opponentId,
      disputeCount: 15,
      refundOrCancelCount: 0,
      confirmedCompletedCount: 10,
    });

    const ch2 = await seedFundedChallenge(deps, 2000);
    await driveToScheduled(deps, ch2);
    await submitResultFlow(deps, {
      challengeId: ch2,
      actor: { kind: "party", partyId: creatorId },
      payload: { winnerPartyId: creatorId },
    });
    await confirmResultFlow(deps, {
      challengeId: ch2,
      actor: { kind: "party", partyId: opponentId },
    });

    await expect(
      payoutAndRankFlow(deps, {
        challengeId: ch2,
        winnerUserId: creatorId,
        idempotencyKey: "pay-app-fraud",
      }),
    ).rejects.toMatchObject({ code: "fraud_payout_blocked" });

    const hold = await deps.notifications.listNotifications(creatorId, {});
    expect(hold.notifications.some((n) => n.type === "fraud_hold")).toBe(true);
  });

  it("payout idempotent replay does not duplicate celebration notifications", async () => {
    const chId = await seedFundedChallenge(deps, 3000);
    await driveToScheduled(deps, chId);
    await submitResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      payload: { winnerPartyId: creatorId },
    });
    await confirmResultFlow(deps, {
      challengeId: chId,
      actor: { kind: "party", partyId: opponentId },
    });

    const key = "idem-pay-dup";
    await payoutAndRankFlow(deps, { challengeId: chId, winnerUserId: creatorId, idempotencyKey: key });
    const mid = (await deps.notifications.listNotifications(creatorId, {})).notifications.filter(
      (n) => n.type === "payout_completed",
    ).length;

    await payoutAndRankFlow(deps, { challengeId: chId, winnerUserId: creatorId, idempotencyKey: key });
    const after = (await deps.notifications.listNotifications(creatorId, {})).notifications.filter(
      (n) => n.type === "payout_completed",
    ).length;
    expect(after).toBe(mid);
  });
});
