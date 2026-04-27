import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { ChallengeService } from "../src/challenges/service.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { SchedulingService } from "../src/scheduling/service.js";
import { InMemoryCheckinRepository } from "../src/checkin/repository.js";
import { CheckinService } from "../src/checkin/service.js";
import { InMemoryVenueLocationProvider } from "../src/checkin/venueProvider.js";
import { buildApiServer } from "../src/http/server.js";
import { isWithinTimeWindow, distanceToVenueMeters } from "../src/checkin/model.js";

const creator = { kind: "party" as const, partyId: "p_creator" };
const opponent = { kind: "party" as const, partyId: "p_opponent" };
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

const NYC = { lat: 40.758, lng: -73.9855 };
/** ~150 m from venue_1 center. */
const NEAR_NYC = { lat: 40.7593, lng: -73.9855 };

function futureExp(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

const slot = { startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" };

async function lockBothEscrows(svc: ChallengeService, id: string): Promise<void> {
  await svc.recordPartyFundsLocked(id, system, "creator");
  await svc.recordPartyFundsLocked(id, system, "opponent");
}

async function scheduleChallenge(
  challenges: ChallengeService,
  scheduling: SchedulingService,
): Promise<{ id: string }> {
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
  await challenges.patchVenue(ch.id, admin, "venue_1");
  const view = await scheduling.proposeSlots({
    challengeId: ch.id,
    actor: creator,
    slots: [slot],
    expiresAt: futureExp(),
  });
  const slotId = view.activePendingProposal!.slots[0]!.id;
  await scheduling.confirmSlot({ challengeId: ch.id, actor: creator, slotId });
  await scheduling.confirmSlot({ challengeId: ch.id, actor: opponent, slotId });
  return { id: ch.id };
}

describe("CheckinService", () => {
  let chRepo: InMemoryChallengeRepository;
  let challenges: ChallengeService;
  let scheduling: SchedulingService;
  let checkinRepo: InMemoryCheckinRepository;
  let venues: InMemoryVenueLocationProvider;
  let checkin: CheckinService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    challenges = new ChallengeService(chRepo);
    scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
    checkinRepo = new InMemoryCheckinRepository();
    venues = new InMemoryVenueLocationProvider();
    const startMs = new Date(slot.startAt).getTime();
    checkin = new CheckinService(checkinRepo, challenges, venues, { windowBeforeStartMinutes: 180, windowAfterStartMinutes: 300 }, () => startMs - 30 * 60_000);
  });

  it("accepts valid check-in within window and radius", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const status = await checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC });
    expect(status.creator?.valid).toBe(true);
    expect(status.creator?.invalidReasons).toEqual([]);
    expect(status.creator!.distanceToVenueMeters).toBeLessThanOrEqual(500);
    expect(status.bothCheckedInValid).toBe(false);

    const s2 = await checkin.submitCheckIn({ challengeId: id, actor: opponent, ...NEAR_NYC });
    expect(s2.bothCheckedInValid).toBe(true);
    expect(await checkin.bothPartiesHaveValidCheckin(id)).toBe(true);
    expect(await checkin.partyHasValidCheckin(id, creator.partyId)).toBe(true);
  });

  it("rejects wrong actor", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    await expect(
      checkin.submitCheckIn({
        challengeId: id,
        actor: { kind: "party", partyId: "stranger" },
        ...NEAR_NYC,
      }),
    ).rejects.toMatchObject({ code: "forbidden_actor" });
  });

  it("rejects check-in outside radius (stores invalid record)", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const paris = { lat: 48.8566, lng: 2.3522 };
    const status = await checkin.submitCheckIn({ challengeId: id, actor: creator, ...paris });
    expect(status.creator?.valid).toBe(false);
    expect(status.creator?.invalidReasons).toContain("outside_radius");
    expect(status.creator?.distanceToVenueMeters).toBeGreaterThan(500);
  });

  it("rejects check-in outside time window (stores invalid)", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const earlyMs = new Date(slot.startAt).getTime() - 5 * 60 * 60_000;
    const earlyCheckin = new CheckinService(
      checkinRepo,
      challenges,
      venues,
      { windowBeforeStartMinutes: 60, windowAfterStartMinutes: 120 },
      () => earlyMs,
    );
    const status = await earlyCheckin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC });
    expect(status.creator?.valid).toBe(false);
    expect(status.creator?.invalidReasons).toContain("outside_time_window");
  });

  it("allows retry after invalid check-in, then succeeds", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    await checkin.submitCheckIn({ challengeId: id, actor: creator, lat: 48.8566, lng: 2.3522 });
    const ok = await checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC });
    expect(ok.creator?.valid).toBe(true);
  });

  it("rejects duplicate valid check-in when re-check-in disabled", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    await checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC });
    await expect(checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC })).rejects.toMatchObject({
      code: "duplicate_checkin",
    });
  });

  it("allows re-check-in when policy enables it", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const relaxed = new CheckinService(checkinRepo, challenges, venues, { allowRecheckin: true }, () =>
      new Date(slot.startAt).getTime(),
    );
    await relaxed.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC });
    const second = await relaxed.submitCheckIn({
      challengeId: id,
      actor: creator,
      lat: NEAR_NYC.lat + 0.0001,
      lng: NEAR_NYC.lng,
    });
    expect(second.creator?.valid).toBe(true);
  });

  it("rejects check-in when challenge is not scheduled", async () => {
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
      checkin.submitCheckIn({ challengeId: ch.id, actor: creator, ...NEAR_NYC }),
    ).rejects.toMatchObject({ code: "challenge_not_scheduled" });
  });

  it("rejects when venue is missing on challenge", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const ch = await chRepo.getById(id);
    expect(ch).not.toBeNull();
    const broken = { ...ch!, venueId: undefined };
    await chRepo.save(broken);

    await expect(checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC })).rejects.toMatchObject({
      code: "missing_venue",
    });
  });

  it("rejects when schedule start is missing", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const ch = await chRepo.getById(id);
    expect(ch).not.toBeNull();
    const broken = { ...ch!, scheduleProposal: undefined };
    await chRepo.save(broken);

    await expect(checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC })).rejects.toMatchObject({
      code: "missing_schedule",
    });
  });

  it("rejects when venue coordinates are unknown", async () => {
    const { id } = await scheduleChallenge(challenges, scheduling);
    const ch = await chRepo.getById(id);
    expect(ch).not.toBeNull();
    await chRepo.save({ ...ch!, venueId: "unknown_venue" });

    await expect(checkin.submitCheckIn({ challengeId: id, actor: creator, ...NEAR_NYC })).rejects.toMatchObject({
      code: "venue_location_unknown",
    });
  });
});

describe("check-in deterministic helpers", () => {
  it("isWithinTimeWindow respects policy symmetrically", () => {
    const start = "2026-06-01T12:00:00.000Z";
    const t0 = new Date(start).getTime();
    expect(isWithinTimeWindow({ nowMs: t0 - 30 * 60_000, startAtIso: start, policy: { windowBeforeStartMinutes: 60, windowAfterStartMinutes: 60, maxDistanceMeters: 1, allowRecheckin: false } })).toBe(true);
    expect(isWithinTimeWindow({ nowMs: t0 - 90 * 60_000, startAtIso: start, policy: { windowBeforeStartMinutes: 60, windowAfterStartMinutes: 60, maxDistanceMeters: 1, allowRecheckin: false } })).toBe(false);
  });

  it("distanceToVenueMeters is zero at same point", () => {
    expect(distanceToVenueMeters(NYC, NYC)).toBe(0);
  });
});

describe("Check-in HTTP", () => {
  it("GET /v1/challenges/:id/checkin returns status", async () => {
    const app = buildApiServer();
    await app.ready();
    const create = await app.inject({
      method: "POST",
      url: "/v1/challenges",
      payload: {
        sport: "golf",
        mode: "1v1",
        creatorPartyId: "ca",
        opponentPartyId: "oa",
        stakeMinor: 100,
        currency: "USD",
      },
    });
    const chId = (JSON.parse(create.body) as { id: string }).id;
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/accept`, payload: { actor: { kind: "party", partyId: "oa" } } });
    for (const uid of ["ca", "oa"] as const) {
      await app.inject({ method: "POST", url: "/v1/wallets", payload: { userId: uid, currency: "USD" } });
      await app.inject({
        method: "POST",
        url: `/v1/wallets/${uid}/credit`,
        payload: { amountMinor: 500, currency: "USD", idempotencyKey: `c-${uid}` },
      });
    }
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "ca", idempotencyKey: "l1" } });
    await app.inject({ method: "POST", url: `/v1/challenges/${chId}/escrow/lock`, payload: { userId: "oa", idempotencyKey: "l2" } });
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
        actor: { kind: "party", partyId: "ca" },
        slots: [slot],
        expiresAt: exp,
      },
    });
    const sid = (JSON.parse(prop.body) as { activePendingProposal: { slots: { id: string }[] } }).activePendingProposal
      .slots[0]!.id;
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "ca" }, slotId: sid },
    });
    await app.inject({
      method: "POST",
      url: `/v1/challenges/${chId}/schedule/confirm`,
      payload: { actor: { kind: "party", partyId: "oa" }, slotId: sid },
    });

    const get = await app.inject({ method: "GET", url: `/v1/challenges/${chId}/checkin` });
    expect(get.statusCode).toBe(200);
    const body = JSON.parse(get.body) as { challengeState: string; bothCheckedInValid: boolean };
    expect(body.challengeState).toBe("scheduled");
    expect(body.bothCheckedInValid).toBe(false);

    await app.close();
  });
});
