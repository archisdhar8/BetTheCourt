import { describe, expect, it, beforeEach } from "vitest";
import { canInitiatePayout, canRecordRanking } from "../src/challenges/model.js";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { SchedulingService } from "../src/scheduling/service.js";
import { canonicalResultFingerprint, ResultsDomainError } from "../src/results/model.js";
import { InMemoryResultsRepository } from "../src/results/repository.js";
import { ResultsService } from "../src/results/service.js";
import { buildApiServer } from "../src/http/server.js";

const creator = { kind: "party" as const, partyId: "p_creator" };
const opponent = { kind: "party" as const, partyId: "p_opponent" };
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

function futureExp(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

const defaultSlots = () => [
  { startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" },
];

async function lockBothEscrows(svc: ChallengeService, id: string): Promise<void> {
  await svc.recordPartyFundsLocked(id, system, "creator");
  await svc.recordPartyFundsLocked(id, system, "opponent");
}

async function confirmFundedSchedule(scheduling: SchedulingService, svc: ChallengeService, chId: string) {
  await svc.patchVenue(chId, admin, "venue_1");
  const view = await scheduling.proposeSlots({
    challengeId: chId,
    actor: creator,
    slots: defaultSlots(),
    expiresAt: futureExp(),
  });
  const slotId = view.activePendingProposal!.slots[0]!.id;
  await scheduling.confirmSlot({ challengeId: chId, actor: creator, slotId });
  await scheduling.confirmSlot({ challengeId: chId, actor: opponent, slotId });
}

describe("ResultsService", () => {
  let chRepo: InMemoryChallengeRepository;
  let challenges: ChallengeService;
  let scheduling: SchedulingService;
  let resultsRepo: InMemoryResultsRepository;
  let results: ResultsService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    challenges = new ChallengeService(chRepo);
    scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
    resultsRepo = new InMemoryResultsRepository();
    results = new ResultsService(resultsRepo, challenges);
  });

  async function scheduledChallenge() {
    const ch = await challenges.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await challenges.accept(ch.id, opponent);
    await lockBothEscrows(challenges, ch.id);
    await confirmFundedSchedule(scheduling, challenges, ch.id);
    return challenges.getChallenge(ch.id);
  }

  it("happy path: submit → confirm advances challenge to confirmed and payout/ranking eligible", async () => {
    const ch = await scheduledChallenge();
    expect(ch.state).toBe("scheduled");

    const view1 = await results.submitResult({
      challengeId: ch.id,
      actor: creator,
      payload: { winner: "creator", sets: ["6-4", "6-2"] },
    });
    expect(view1.challengeState).toBe("completed");
    expect(view1.activeRound?.status).toBe("pending");
    expect(view1.activeRound?.fingerprint).toBe(
      canonicalResultFingerprint({ winner: "creator", sets: ["6-4", "6-2"] }),
    );

    const view2 = await results.confirmResult({ challengeId: ch.id, actor: opponent });
    expect(view2.challengeState).toBe("confirmed");
    expect(view2.activeRound).toBeUndefined();
    expect(view2.rounds[0]?.status).toBe("confirmed");

    const final = await challenges.getChallenge(ch.id);
    expect(canInitiatePayout(final.state)).toBe(true);
    expect(canRecordRanking(final.state)).toBe(true);
  });

  it("rejects ackFingerprint that does not match submitted payload (deterministic compare)", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { a: 1, b: 2 } });
    await expect(
      results.confirmResult({
        challengeId: ch.id,
        actor: opponent,
        ackFingerprint: "not-the-fingerprint",
      }),
    ).rejects.toMatchObject({ code: "payload_mismatch" });
  });

  it("same semantic payload with different key order shares one fingerprint", () => {
    const fp1 = canonicalResultFingerprint({ b: 2, a: 1 });
    const fp2 = canonicalResultFingerprint({ a: 1, b: 2 });
    expect(fp1).toBe(fp2);
  });

  it("forbids submitter from confirming", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { x: true } });
    await expect(results.confirmResult({ challengeId: ch.id, actor: creator })).rejects.toMatchObject({
      code: "self_confirm_forbidden",
    });
  });

  it("rejects invalid party actor on submit", async () => {
    const ch = await scheduledChallenge();
    await expect(
      results.submitResult({
        challengeId: ch.id,
        actor: { kind: "party", partyId: "stranger" },
        payload: {},
      }),
    ).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("confirm is idempotent for the same party", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: opponent, payload: { score: "1-0" } });
    const a = await results.confirmResult({ challengeId: ch.id, actor: creator });
    const b = await results.confirmResult({ challengeId: ch.id, actor: creator });
    expect(b.challengeState).toBe(a.challengeState);
    expect(b.rounds[0]?.decisions[creator.partyId]?.type).toBe("confirm");
  });

  it("dispute flow blocks payout and ranking until resolved", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { holes: 18 } });
    const d = await results.disputeResult({
      challengeId: ch.id,
      actor: opponent,
      reason: "score mismatch",
      counterPayload: { holes: 19 },
    });
    expect(d.challengeState).toBe("disputed");
    expect(d.rounds[0]?.status).toBe("disputed");
    expect(canInitiatePayout(d.challengeState)).toBe(false);
    expect(canRecordRanking(d.challengeState)).toBe(false);

    await expect(challenges.assertRankingAllowedForChallenge(ch.id)).rejects.toMatchObject({ code: "ranking_blocked" });
  });

  it("dispute idempotent for same party after challenge is disputed", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { k: 1 } });
    await results.disputeResult({ challengeId: ch.id, actor: opponent, reason: "once" });
    const again = await results.disputeResult({ challengeId: ch.id, actor: opponent, reason: "ignored" });
    expect(again.challengeState).toBe("disputed");
  });

  it("forbids submitter from disputing via results flow", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { k: 1 } });
    await expect(
      results.disputeResult({ challengeId: ch.id, actor: creator, reason: "oops" }),
    ).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("blocks submit before scheduled", async () => {
    const ch = await challenges.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await challenges.accept(ch.id, opponent);
    await expect(
      results.submitResult({ challengeId: ch.id, actor: creator, payload: { x: 1 } }),
    ).rejects.toMatchObject({ code: "challenge_not_resultable" });
  });

  it("rejects second decision type after confirm", async () => {
    const ch = await scheduledChallenge();
    await results.submitResult({ challengeId: ch.id, actor: creator, payload: { a: 1 } });
    await results.confirmResult({ challengeId: ch.id, actor: opponent });
    await expect(
      results.disputeResult({ challengeId: ch.id, actor: opponent, reason: "too late" }),
    ).rejects.toMatchObject({ code: "challenge_not_resultable" });
  });
});

describe("Results HTTP (Fastify)", () => {
  it("GET and POST results routes return JSON", async () => {
    const app = buildApiServer();
    await app.ready();

    const create = await app.inject({
      method: "POST",
      url: "/v1/challenges",
      payload: {
        sport: "pickleball",
        mode: "1v1",
        creatorPartyId: "pc",
        opponentPartyId: "po",
        stakeMinor: 100,
        currency: "USD",
      },
    });
    expect(create.statusCode).toBe(201);
    const chId = (JSON.parse(create.body) as { id: string }).id;

    const accept = await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/accept`,
      payload: { actor: { kind: "party", partyId: "po" } },
    });
    expect(accept.statusCode).toBe(200);

    for (const uid of ["pc", "po"] as const) {
      const cw = await app.inject({
        method: "POST",
        url: "/v1/wallets",
        payload: { userId: uid, currency: "USD" },
      });
      expect(cw.statusCode).toBe(201);
      const cr = await app.inject({
        method: "POST",
        url: `/v1/wallets/${uid}/credit`,
        payload: { amountMinor: 500, currency: "USD", idempotencyKey: `credit-${uid}` },
      });
      expect(cr.statusCode).toBe(200);
    }

    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/escrow/lock`,
      payload: { userId: "pc", idempotencyKey: "r1" },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/escrow/lock`,
      payload: { userId: "po", idempotencyKey: "r2" },
    });

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
        actor: { kind: "party", partyId: "pc" },
        slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
        expiresAt: exp,
      },
    });
    const slotId = (JSON.parse(prop.body) as { activePendingProposal: { slots: { id: string }[] } })
      .activePendingProposal.slots[0]!.id;
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "pc" }, slotId },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "po" }, slotId },
    });

    const get0 = await app.inject({ method: "GET", url: `/v1/challenges/${chId}/results` });
    expect(get0.statusCode).toBe(200);
    const body0 = JSON.parse(get0.body) as { challengeState: string };
    expect(body0.challengeState).toBe("scheduled");

    const sub = await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/submit`,
      payload: { actor: { kind: "party", partyId: "pc" }, payload: { w: "pc" } },
    });
    expect(sub.statusCode).toBe(200);

    const conf = await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/results/confirm`,
      payload: { actor: { kind: "party", partyId: "po" } },
    });
    expect(conf.statusCode).toBe(200);
    expect((JSON.parse(conf.body) as { challengeState: string }).challengeState).toBe("confirmed");

    await app.close();
  });
});

describe("ResultsDomainError", () => {
  it("is instanceof Error", () => {
    const e = new ResultsDomainError({ code: "not_found", message: "x" });
    expect(e).toBeInstanceOf(Error);
  });
});
