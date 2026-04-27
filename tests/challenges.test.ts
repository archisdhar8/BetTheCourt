import { describe, expect, it, beforeEach } from "vitest";
import { ChallengeDomainError, canInitiatePayout, canRecordRanking } from "../src/challenges/model.js";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { assertTransition } from "../src/challenges/stateMachine.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { SchedulingService } from "../src/scheduling/service.js";

const creator = { kind: "party" as const, partyId: "p_creator" };
const opponent = { kind: "party" as const, partyId: "p_opponent" };
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

async function lockBothEscrows(svc: ChallengeService, id: string): Promise<void> {
  await svc.recordPartyFundsLocked(id, system, "creator");
  await svc.recordPartyFundsLocked(id, system, "opponent");
}

const defaultSlots = () => [
  { startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" },
];

function futureExp(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

/** Funded + venue + scheduling agent confirms one slot → `scheduled`. */
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
  return svc.getChallenge(chId);
}

describe("ChallengeService", () => {
  let repo: InMemoryChallengeRepository;
  let svc: ChallengeService;
  let schedRepo: InMemorySchedulingRepository;
  let scheduling: SchedulingService;

  beforeEach(() => {
    repo = new InMemoryChallengeRepository();
    svc = new ChallengeService(repo);
    schedRepo = new InMemorySchedulingRepository();
    scheduling = new SchedulingService(schedRepo, svc);
  });

  it("creates draft when initialState is draft and submit moves to pending", async () => {
    const ch = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
      initialState: "draft",
    });
    expect(ch.state).toBe("draft");
    const after = await svc.submitDraft(ch.id, creator);
    expect(after.state).toBe("pending");
    expect(after.transitions.some((t) => t.action === "submit")).toBe(true);
  });

  it("defaults to pending on create", async () => {
    const ch = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
    });
    expect(ch.state).toBe("pending");
  });

  it("rejects opponent accepting from draft", async () => {
    const ch = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
      initialState: "draft",
    });
    await expect(svc.accept(ch.id, opponent)).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("schedule propose in accepted does not fund; funds_locked runs after both wallet flags", async () => {
    const ch0 = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    const prop = defaultSlots()[0]!;
    await scheduling.proposeSlots({
      challengeId: ch0.id,
      actor: creator,
      slots: defaultSlots(),
      expiresAt: futureExp(),
    });
    let ch = await svc.getChallenge(ch0.id);
    expect(ch.state).toBe("accepted");
    expect(ch.scheduleProposal).toMatchObject({ startAt: prop.startAt, endAt: prop.endAt });

    ch = await svc.recordPartyFundsLocked(ch0.id, system, "creator");
    expect(ch.state).toBe("accepted");
    expect(ch.creatorFundsLocked).toBe(true);
    expect(ch.opponentFundsLocked).toBe(false);

    ch = await svc.recordPartyFundsLocked(ch0.id, system, "opponent");
    expect(ch.state).toBe("funded");
    expect(ch.creatorFundsLocked).toBe(true);
    expect(ch.opponentFundsLocked).toBe(true);
    expect(ch.transitions.some((t) => t.action === "funds_locked" && t.to === "funded")).toBe(true);

    const replay = await svc.recordPartyFundsLocked(ch0.id, system, "creator");
    expect(replay.state).toBe("funded");
  });

  it("runs happy path through payout", async () => {
    const ch0 = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
    });
    let ch = await svc.accept(ch0.id, opponent);
    expect(ch.state).toBe("accepted");

    await lockBothEscrows(svc, ch.id);
    ch = await svc.getChallenge(ch.id);
    expect(ch.state).toBe("funded");

    ch = await confirmFundedSchedule(scheduling, svc, ch.id);
    expect(ch.state).toBe("scheduled");
    expect(ch.transitions.some((t) => t.action === "confirm_schedule_agent")).toBe(true);

    ch = await svc.completeMatch(ch.id, creator, { winner: "a" });
    expect(ch.state).toBe("completed");

    ch = await svc.confirmResult(ch.id, opponent);
    expect(ch.state).toBe("confirmed");
    expect(canInitiatePayout(ch.state)).toBe(true);
    expect(canRecordRanking(ch.state)).toBe(true);

    ch = await svc.finalizePayout(ch.id, system);
    expect(ch.state).toBe("paid_out");
    expect(canRecordRanking(ch.state)).toBe(true);
  });

  it("blocks payout unless confirmed", async () => {
    const ch0 = await svc.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 500,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await expect(svc.finalizePayout(ch0.id, system)).rejects.toMatchObject({ code: "payout_blocked" });
  });

  it("blocks payout for non-system actor", async () => {
    const ch0 = await svc.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 500,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    await confirmFundedSchedule(scheduling, svc, ch0.id);
    await svc.completeMatch(ch0.id, opponent, { score: "6-4" });
    await svc.confirmResult(ch0.id, creator);
    await expect(svc.finalizePayout(ch0.id, creator)).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("dispute blocks payout and ranking", async () => {
    const ch0 = await svc.createChallenge({
      sport: "golf",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 2000,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    await confirmFundedSchedule(scheduling, svc, ch0.id);
    await svc.completeMatch(ch0.id, creator, { holes: 18 });
    let ch = await svc.dispute(ch0.id, opponent, "score mismatch");
    expect(ch.state).toBe("disputed");
    expect(canInitiatePayout(ch.state)).toBe(false);
    expect(canRecordRanking(ch.state)).toBe(false);
    await expect(svc.assertRankingAllowedForChallenge(ch0.id)).rejects.toMatchObject({ code: "ranking_blocked" });
    await expect(svc.finalizePayout(ch0.id, system)).rejects.toMatchObject({ code: "payout_blocked" });

    ch = await svc.resolveDispute(ch0.id, admin, "confirm");
    expect(ch.state).toBe("confirmed");
    await svc.finalizePayout(ch0.id, system);
  });

  it("admin can resolve dispute as refund", async () => {
    const ch0 = await svc.createChallenge({
      sport: "golf",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 500,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    await confirmFundedSchedule(scheduling, svc, ch0.id);
    await svc.completeMatch(ch0.id, creator, { strokes: 82 });
    await svc.dispute(ch0.id, opponent, "rules");
    const ch = await svc.resolveDispute(ch0.id, admin, "refund");
    expect(ch.state).toBe("refunded");
  });

  it("admin can refund from funded", async () => {
    const ch0 = await svc.createChallenge({
      sport: "soccer",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    const ch = await svc.cancel(ch0.id, admin);
    expect(ch.state).toBe("refunded");
  });

  it("creator cannot refund funded without admin rule", async () => {
    const ch0 = await svc.createChallenge({
      sport: "soccer",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    await expect(svc.cancel(ch0.id, creator)).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("rejects funds lock before accept", async () => {
    const ch0 = await svc.createChallenge({
      sport: "soccer",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await expect(svc.recordPartyFundsLocked(ch0.id, system, "creator")).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("rejects non-system recording funds locked", async () => {
    const ch0 = await svc.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await expect(svc.recordPartyFundsLocked(ch0.id, creator, "creator")).rejects.toMatchObject({
      code: "forbidden_actor",
    });
  });

  it("prevents submitter from confirming their own result", async () => {
    const ch0 = await svc.createChallenge({
      sport: "pickleball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await svc.accept(ch0.id, opponent);
    await lockBothEscrows(svc, ch0.id);
    await confirmFundedSchedule(scheduling, svc, ch0.id);
    await svc.completeMatch(ch0.id, creator, { win: true });
    await expect(svc.confirmResult(ch0.id, creator)).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("decline and cancel reach cancelled", async () => {
    const a = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    const d = await svc.decline(a.id, opponent);
    expect(d.state).toBe("cancelled");

    const b = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    const c = await svc.cancel(b.id, creator);
    expect(c.state).toBe("cancelled");
  });

  it("rejects unknown party actor", async () => {
    const ch0 = await svc.createChallenge({
      sport: "basketball",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 100,
      currency: "USD",
    });
    await expect(svc.accept(ch0.id, { kind: "party", partyId: "stranger" })).rejects.toMatchObject({
      code: "forbidden_actor",
    });
  });
});

describe("assertTransition", () => {
  it("throws invalid_transition for illegal action", () => {
    const ch = {
      id: "x",
      sport: "b",
      mode: "1v1" as const,
      creatorPartyId: "c",
      opponentPartyId: "o",
      stakeMinor: 1,
      currency: "USD",
      state: "draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transitions: [],
    };
    expect(() => assertTransition(ch, "accept", opponent)).toThrow(ChallengeDomainError);
  });
});
