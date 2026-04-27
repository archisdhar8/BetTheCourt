import { describe, expect, it } from "vitest";
import {
  centroidOf,
  travelFairnessScore,
  travelImbalanceKm,
  resolveHomeCourt,
  sportCompatibilityScore,
} from "../src/venue/scoring.js";
import { rankVenues } from "../src/venue/service.js";
import type { ParticipantInput, VenueRecord } from "../src/venue/model.js";

const A: ParticipantInput = {
  partyId: "a",
  location: { lat: 40.73, lng: -73.99 },
  maxTravelDistanceKm: 15,
};

const B: ParticipantInput = {
  partyId: "b",
  location: { lat: 40.75, lng: -74.0 },
  maxTravelDistanceKm: 15,
};

function baseVenue(id: string, lat: number, lng: number, overrides: Partial<VenueRecord> = {}): VenueRecord {
  return {
    id,
    name: id,
    location: { lat, lng },
    sports: ["basketball"],
    venueType: "court",
    isPublic: true,
    qualityScore: 0.75,
    outdoorCapable: true,
    hasLighting: true,
    parkingScore: 0.6,
    priceBand: "free",
    ...overrides,
  };
}

describe("centroidOf", () => {
  it("averages participant coordinates", () => {
    const c = centroidOf([A, B]);
    expect(c.lat).toBeCloseTo((A.location.lat + B.location.lat) / 2, 5);
    expect(c.lng).toBeCloseTo((A.location.lng + B.location.lng) / 2, 5);
  });
});

describe("travelFairnessScore", () => {
  it("rewards balanced travel", () => {
    const fair = travelFairnessScore(10, 0.5);
    const skew = travelFairnessScore(10, 6);
    expect(fair).toBeGreaterThan(skew);
  });
});

describe("travelImbalanceKm", () => {
  it("returns max-min", () => {
    expect(travelImbalanceKm([2, 5, 4])).toBe(3);
  });
});

describe("resolveHomeCourt", () => {
  it("detects affiliated party", () => {
    const v = baseVenue("v1", 40.74, -73.995, { affiliatedPartyId: "a" });
    expect(resolveHomeCourt(v, [A, B])).toBe(true);
  });

  it("detects home venue id list", () => {
    const v = baseVenue("home_a", 40.74, -73.995);
    expect(resolveHomeCourt(v, [{ ...A, homeVenueIds: ["home_a"] }, B])).toBe(true);
  });
});

describe("sportCompatibilityScore", () => {
  it("is 1 only when sport supported", () => {
    const v = baseVenue("v", 40.74, -73.995, { sports: ["tennis"] });
    expect(sportCompatibilityScore("basketball", v)).toBe(0);
  });
});

describe("rankVenues", () => {
  const prefs = {
    preferredRadiusKm: 12,
    preferredVenueTypes: ["court" as const, "park" as const],
    publicPrivate: "either" as const,
    priceSensitivity: "any" as const,
    parkingImportance: 0.3,
    lightingImportance: 0.2,
    indoorOutdoor: "either" as const,
  };

  it("filters infeasible and wrong-sport venues", async () => {
    const far: VenueRecord = baseVenue("far", 41.2, -73.9);
    const wrongSport = baseVenue("ws", 40.74, -73.995, { sports: ["golf"] });
    const ok = baseVenue("ok", 40.74, -73.995);

    const res = await rankVenues({
      sport: "basketball",
      participants: [A, B],
      venues: [far, wrongSport, ok],
      preferences: prefs,
      now: new Date("2026-04-22T20:00:00.000Z"),
    });

    expect(res.venues.map((v) => v.venueId)).toEqual(["ok"]);
  });

  it("prefers fair central venue over skewed alternative", async () => {
    const c = centroidOf([A, B]);
    const central = baseVenue("central", c.lat, c.lng);
    const closerToA = baseVenue("nearA", A.location.lat + 0.002, A.location.lng);

    const res = await rankVenues({
      sport: "basketball",
      participants: [A, B],
      venues: [closerToA, central],
      preferences: prefs,
      now: new Date("2026-04-22T20:00:00.000Z"),
    });

    expect(res.venues[0]?.venueId).toBe("central");
    expect(res.venues[0]!.fairnessScore).toBeGreaterThanOrEqual(res.venues[1]!.fairnessScore);
  });

  it("labels home court and can reduce suitability vs neutral twin", async () => {
    const loc = { lat: 40.74, lng: -73.995 };
    const neutral = baseVenue("neutral", loc.lat, loc.lng, { id: "neutral" });
    const home = baseVenue("home", loc.lat, loc.lng, {
      id: "home",
      affiliatedPartyId: "a",
      qualityScore: 0.75,
    });

    const res = await rankVenues({
      sport: "basketball",
      participants: [A, B],
      venues: [neutral, home],
      preferences: prefs,
      now: new Date("2026-04-22T20:00:00.000Z"),
      config: { homeCourtSuitabilityMultiplier: 0.85 },
    });

    const n = res.venues.find((v) => v.venueId === "neutral")!;
    const h = res.venues.find((v) => v.venueId === "home")!;
    expect(h.homeCourt).toBe(true);
    expect(n.homeCourt).toBe(false);
    expect(h.suitabilityScore).toBeLessThanOrEqual(n.suitabilityScore);
  });

  it("supports optional explanation hook", async () => {
    const res = await rankVenues({
      sport: "basketball",
      participants: [A, B],
      venues: [baseVenue("v1", 40.74, -73.995)],
      preferences: prefs,
      now: new Date("2026-04-22T20:00:00.000Z"),
      explanationHook: async (row) => `[x] ${row.explanation}`,
    });

    expect(res.venues[0]?.explanation.startsWith("[x] ")).toBe(true);
  });
});
