import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { SchedulingDomainError } from "../src/scheduling/model.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { haversineKm, SchedulingService } from "../src/scheduling/service.js";

const creator = { kind: "party" as const, partyId: "p_creator" };
const opponent = { kind: "party" as const, partyId: "p_opponent" };
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

function futureExp(days = 7): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

async function fundChallenge(svc: ChallengeService, id: string) {
  await svc.recordPartyFundsLocked(id, system, "creator");
  await svc.recordPartyFundsLocked(id, system, "opponent");
}

describe("SchedulingService", () => {
  let chRepo: InMemoryChallengeRepository;
  let svc: ChallengeService;
  let sRepo: InMemorySchedulingRepository;
  let scheduling: SchedulingService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    svc = new ChallengeService(chRepo);
    sRepo = new InMemorySchedulingRepository();
    scheduling = new SchedulingService(sRepo, svc);
  });

  async function acceptedChallenge() {
    const ch = await svc.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creator.partyId,
      opponentPartyId: opponent.partyId,
      stakeMinor: 1000,
      currency: "USD",
    });
    await svc.accept(ch.id, opponent);
    return ch;
  }

  it("proposes multiple slots and lists schedule view", async () => {
    const ch = await acceptedChallenge();
    const view = await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [
        { startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" },
        { startAt: "2026-06-02T14:00:00.000Z", endAt: "2026-06-02T16:00:00.000Z" },
      ],
      expiresAt: futureExp(),
      travelBufferMinutes: 30,
    });
    expect(view.activePendingProposal?.slots).toHaveLength(2);
    expect(view.activePendingProposal?.slots[0]!.effectiveEndAt).toBe("2026-06-01T16:30:00.000Z");
    const listed = await scheduling.getScheduleView(ch.id);
    expect(listed.proposals).toHaveLength(1);
  });

  it("counter-propose supersedes pending", async () => {
    const ch = await acceptedChallenge();
    await fundChallenge(svc, ch.id);
    await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
      expiresAt: futureExp(),
    });
    await scheduling.counterProposeSlots({
      challengeId: ch.id,
      actor: opponent,
      slots: [{ startAt: "2026-07-01T14:00:00.000Z", endAt: "2026-07-01T16:00:00.000Z" }],
      expiresAt: futureExp(),
    });
    const v = await scheduling.getScheduleView(ch.id);
    expect(v.proposals.filter((p) => p.status === "superseded")).toHaveLength(1);
    expect(v.activePendingProposal?.proposedByPartyId).toBe(opponent.partyId);
  });

  it("rejects confirm without venue and requires funded", async () => {
    const ch = await acceptedChallenge();
    await fundChallenge(svc, ch.id);
    const view = await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
      expiresAt: futureExp(),
    });
    const sid = view.activePendingProposal!.slots[0]!.id;
    await expect(
      scheduling.confirmSlot({ challengeId: ch.id, actor: creator, slotId: sid }),
    ).rejects.toMatchObject({ code: "venue_required" });

    await svc.patchVenue(ch.id, admin, "venue_x");
    await scheduling.confirmSlot({ challengeId: ch.id, actor: creator, slotId: sid });
    await scheduling.confirmSlot({ challengeId: ch.id, actor: opponent, slotId: sid });
    const done = await svc.getChallenge(ch.id);
    expect(done.state).toBe("scheduled");
  });

  it("rejects funding_required when confirming from accepted only", async () => {
    const ch = await acceptedChallenge();
    const view = await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
      expiresAt: futureExp(),
    });
    await svc.patchVenue(ch.id, admin, "venue_x");
    const sid = view.activePendingProposal!.slots[0]!.id;
    await expect(
      scheduling.confirmSlot({ challengeId: ch.id, actor: creator, slotId: sid }),
    ).rejects.toMatchObject({ code: "funding_required" });
  });

  it("rejects slot mismatch between parties", async () => {
    const ch = await acceptedChallenge();
    await fundChallenge(svc, ch.id);
    await svc.patchVenue(ch.id, admin, "venue_x");
    const view = await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [
        { startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" },
        { startAt: "2026-06-02T14:00:00.000Z", endAt: "2026-06-02T16:00:00.000Z" },
      ],
      expiresAt: futureExp(),
    });
    const [s1, s2] = view.activePendingProposal!.slots;
    await scheduling.confirmSlot({ challengeId: ch.id, actor: creator, slotId: s1.id });
    await expect(
      scheduling.confirmSlot({ challengeId: ch.id, actor: opponent, slotId: s2.id }),
    ).rejects.toMatchObject({ code: "slot_mismatch" });
  });

  it("expires stale proposals", async () => {
    const ch = await acceptedChallenge();
    await scheduling.proposeSlots({
      challengeId: ch.id,
      actor: creator,
      slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
      expiresAt: futureExp(1),
    });
    const v = await scheduling.expireStaleProposals({
      challengeId: ch.id,
      asOf: futureExp(3),
    });
    expect(v.activePendingProposal).toBeUndefined();
    expect(v.proposals[0]?.status).toBe("expired");
  });

  it("rejects forbidden actor", async () => {
    const ch = await acceptedChallenge();
    await expect(
      scheduling.proposeSlots({
        challengeId: ch.id,
        actor: { kind: "party", partyId: "stranger" },
        slots: [{ startAt: "2026-06-01T14:00:00.000Z", endAt: "2026-06-01T16:00:00.000Z" }],
        expiresAt: futureExp(),
      }),
    ).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("haversineKm is deterministic", () => {
    const km = haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
    expect(km).toBeGreaterThan(3000);
    expect(km).toBeLessThan(5000);
  });
});

describe("SchedulingDomainError", () => {
  it("maps httpStatus", () => {
    const e = new SchedulingDomainError({ code: "not_found", message: "x", httpStatus: 404 });
    expect(e.httpStatus).toBe(404);
  });
});
