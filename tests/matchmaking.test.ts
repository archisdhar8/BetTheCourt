import { describe, expect, it } from "vitest";
import {
  activityScore,
  availabilityOverlapScore,
  haversineKm,
  stakeOverlapScore,
} from "../src/matchmaking/scoring.js";
import { recommendMatches } from "../src/matchmaking/service.js";
import type { TeamCandidate, UserCandidate, UserSeekerProfile } from "../src/matchmaking/model.js";

const NYC = { lat: 40.7128, lng: -74.006 };
const BK = { lat: 40.6782, lng: -73.9442 };

function baseUserSeeker(overrides: Partial<UserSeekerProfile> = {}): UserSeekerProfile {
  return {
    kind: "user",
    userId: "u_seeker",
    sport: "basketball",
    location: NYC,
    maxTravelDistanceKm: 25,
    skillRating: 30,
    wins: 10,
    losses: 8,
    preferredStake: { currency: "USD", minMinor: 1000, maxMinor: 5000 },
    preferredFormats: ["1v1"],
    availabilityUtc: [{ weekday: 3, startMinute: 18 * 60, endMinute: 22 * 60 }],
    pastOpponentIds: [],
    trustScore: 80,
    verificationScore: 70,
    lastActiveAt: "2026-04-22T12:00:00.000Z",
    ...overrides,
  };
}

function baseUserCandidate(id: string, overrides: Partial<UserCandidate> = {}): UserCandidate {
  return {
    party: "user",
    userId: id,
    sport: "basketball",
    location: BK,
    skillRating: 31,
    wins: 5,
    losses: 5,
    preferredStake: { currency: "USD", minMinor: 2000, maxMinor: 6000 },
    preferredFormats: ["1v1"],
    availabilityUtc: [{ weekday: 3, startMinute: 19 * 60, endMinute: 21 * 60 }],
    trustScore: 75,
    verificationScore: 65,
    lastActiveAt: "2026-04-22T11:00:00.000Z",
    ...overrides,
  };
}

describe("haversineKm", () => {
  it("computes plausible NYC↔Brooklyn distance", () => {
    const km = haversineKm(NYC, BK);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(12);
  });
});

describe("activityScore", () => {
  it("returns 0 for invalid timestamps", () => {
    const now = new Date("2026-04-22T12:00:00.000Z");
    expect(activityScore("not-a-date", now, 24)).toBe(0);
  });

  it("rewards very recent activity", () => {
    const now = new Date("2026-04-22T12:00:00.000Z");
    expect(activityScore("2026-04-22T11:59:00.000Z", now, 24)).toBeGreaterThan(0.95);
  });
});

describe("stakeOverlapScore", () => {
  it("returns 0 on currency mismatch", () => {
    const a = { currency: "USD", minMinor: 1000, maxMinor: 5000 };
    const b = { currency: "EUR", minMinor: 1000, maxMinor: 5000 };
    expect(stakeOverlapScore(a, b)).toBe(0);
  });
});

describe("availabilityOverlapScore", () => {
  it("returns 0 when no overlapping minutes on same weekday", () => {
    const now = new Date("2026-04-22T12:00:00.000Z"); // Wednesday UTC
    const seeker = [{ weekday: 3, startMinute: 10 * 60, endMinute: 11 * 60 }];
    const cand = [{ weekday: 3, startMinute: 12 * 60, endMinute: 13 * 60 }];
    expect(availabilityOverlapScore(seeker, cand, now)).toBe(0);
  });
});

describe("recommendMatches", () => {
  it("excludes self, wrong sport, too far, incompatible formats", async () => {
    const seeker = baseUserSeeker();
    const candidates: UserCandidate[] = [
      baseUserCandidate("u_seeker"),
      baseUserCandidate("u_far", { location: { lat: 41.5, lng: -74.0 } }),
      baseUserCandidate("u_wrong_sport", { sport: "golf" }),
      baseUserCandidate("u_bad_format", { preferredFormats: ["5v5"] }),
      baseUserCandidate("u_ok", { skillRating: 30 }),
    ];

    const res = await recommendMatches({
      seeker,
      candidates,
      now: new Date("2026-04-22T20:00:00.000Z"),
      config: { skillRatingBand: 10 },
    });

    const ids = res.recommendations.map((r) => (r.opponent.party === "user" ? r.opponent.userId : ""));
    expect(ids).toContain("u_ok");
    expect(ids).not.toContain("u_seeker");
    expect(ids).not.toContain("u_far");
    expect(ids).not.toContain("u_wrong_sport");
    expect(ids).not.toContain("u_bad_format");
  });

  it("ranks closer / better skill fit above worse matches", async () => {
    const seeker = baseUserSeeker({ location: NYC, skillRating: 30, maxTravelDistanceKm: 50 });
    const candidates: UserCandidate[] = [
      baseUserCandidate("u_close", { location: BK, skillRating: 30.5 }),
      baseUserCandidate("u_skill_far", { location: BK, skillRating: 45 }),
    ];

    const res = await recommendMatches({
      seeker,
      candidates,
      now: new Date("2026-04-22T20:00:00.000Z"),
      config: { skillRatingBand: 8 },
    });

    expect(res.recommendations[0]?.opponent).toEqual({ party: "user", userId: "u_close" });
  });

  it("applies rematch penalty vs similar alternative", async () => {
    const seeker = baseUserSeeker({
      pastOpponentIds: ["u_rem"],
      rivalryModeEnabled: false,
    });

    const candidates: UserCandidate[] = [
      baseUserCandidate("u_rem", { skillRating: 30, location: BK }),
      baseUserCandidate("u_fresh", { skillRating: 30.2, location: BK }),
    ];

    const res = await recommendMatches({
      seeker,
      candidates,
      now: new Date("2026-04-22T20:00:00.000Z"),
    });

    expect(res.recommendations[0]?.opponent).toEqual({ party: "user", userId: "u_fresh" });
    const rem = res.recommendations.find((r) => r.opponent.party === "user" && r.opponent.userId === "u_rem");
    expect(rem?.featureBreakdown.rematchPenaltyApplied).toBe(true);
    expect(rem?.acceptanceLikelihood ?? 1).toBeLessThan(
      res.recommendations.find((r) => r.opponent.party === "user" && r.opponent.userId === "u_fresh")
        ?.acceptanceLikelihood ?? 0,
    );
  });

  it("does not treat past opponents as rematch when rivalry mode is enabled", async () => {
    const seeker = baseUserSeeker({
      pastOpponentIds: ["u_rem"],
      rivalryModeEnabled: true,
    });

    const candidates: UserCandidate[] = [
      baseUserCandidate("u_rem", { skillRating: 30, location: BK }),
      baseUserCandidate("u_fresh", { skillRating: 30.2, location: BK }),
    ];

    const res = await recommendMatches({
      seeker,
      candidates,
      now: new Date("2026-04-22T20:00:00.000Z"),
      config: { rivalryModeEnabled: true },
    });

    const rem = res.recommendations.find((r) => r.opponent.party === "user" && r.opponent.userId === "u_rem");
    expect(rem?.featureBreakdown.rematchPenaltyApplied).toBe(false);
  });

  it("does not match team candidates for user seekers", async () => {
    const seeker = baseUserSeeker();
    const team: TeamCandidate = {
      party: "team",
      teamId: "t1",
      memberCount: 5,
      sport: "basketball",
      location: BK,
      skillRating: 30,
      wins: 1,
      losses: 1,
      preferredStake: { currency: "USD", minMinor: 1000, maxMinor: 5000 },
      preferredFormats: ["1v1"],
      availabilityUtc: [{ weekday: 3, startMinute: 18 * 60, endMinute: 22 * 60 }],
      trustScore: 90,
      verificationScore: 90,
      lastActiveAt: "2026-04-22T10:00:00.000Z",
    };

    const res = await recommendMatches({
      seeker,
      candidates: [team, baseUserCandidate("u_ok")],
      now: new Date("2026-04-22T20:00:00.000Z"),
    });

    expect(res.recommendations.every((r) => r.opponent.party === "user")).toBe(true);
  });

  it("supports optional AI explanation hook", async () => {
    const seeker = baseUserSeeker();
    const res = await recommendMatches({
      seeker,
      candidates: [baseUserCandidate("u_ok")],
      now: new Date("2026-04-22T20:00:00.000Z"),
      explanationHook: async (row) => `[AI] ${row.explanation}`,
    });

    expect(res.recommendations[0]?.explanation.startsWith("[AI] ")).toBe(true);
  });
});
