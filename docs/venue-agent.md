# Venue Discovery Agent

## Architecture (parallel to Matchmaking)

| Matchmaking | Venue Discovery |
|---------------|-----------------|
| `src/matchmaking/model.ts` | `src/venue/model.ts` |
| `src/matchmaking/scoring.ts` | `src/venue/scoring.ts` |
| `src/matchmaking/service.ts` | `src/venue/service.ts` |
| `src/matchmaking/explanations.ts` | `src/venue/explanations.ts` |
| `src/matchmaking/contract.ts` | `src/venue/contract.ts` |
| `src/matchmaking/aiExplanation.ts` | `src/venue/aiExplanation.ts` |
| `src/matchmaking/http/register.ts` | `src/venue/http/register.ts` |
| `src/matchmaking/http/server.ts` | `src/venue/http/server.ts` |

Shared primitives: `GeoPoint` / `geoPointSchema` from matchmaking contracts; `haversineKm` / `clamp01` from matchmaking scoring for consistency.

Combined API entry: `src/http/server.ts` registers **both** route groups on one Fastify instance.

## Goal

Given **two or more** parties (users or teams represented by a `partyId`), a **sport**, and a **catalog of candidate venues**, return a **deterministically ranked** list with travel splits, fairness, centrality, preference fit, availability confidence, and explicit **home-court** labeling.

## HTTP API

`POST /v1/venue-discovery/rank`

- Validates `venueDiscoveryRequestSchema` (`src/venue/contract.ts`).
- Returns `VenueDiscoveryResult` (`src/venue/model.ts`).
- Optional AI rewrite: `options.useAiExplanations: true` plus `OPENAI_API_KEY` (same env pattern as matchmaking).

## Scoring (deterministic)

For each venue after **hard filters**:

1. **Sport compatibility** — venue must list the requested sport (`sportCompatibilityScore === 1`); others dropped.
2. **Travel feasibility** — each party’s straight-line distance must be ≤ that party’s `maxTravelDistanceKm`.
3. **Centrality** — distance from venue to the **arithmetic centroid** of party locations vs `preferences.preferredRadiusKm`:  
   `centrality = clamp01(1 - d_centroid / preferredRadiusKm)`.
4. **Travel fairness** — penalize **imbalance** `max(d_i) - min(d_i)` relative to total travel.  
5. **Travel efficiency** — lower total group travel vs a **baseline** “everyone meets at centroid” total travel.
6. **Venue quality** — `venue.qualityScore` in `[0,1]`.
7. **Preference match** — weighted blend of public/private, price sensitivity, parking & lighting importance, indoor/outdoor, venue type list.
8. **Availability confidence** — merges `availabilityConfidence` (default conservative when missing), `scheduleKnown`, and a soft check vs `timeWindowUtc` + `now` (still ranks when data is incomplete).

**Suitability** = weighted average of the above (sport compatibility is 1 for survivors). If **`homeCourt`** is true (via `affiliatedPartyId` or a party’s `homeVenueIds`), suitability is multiplied by `homeCourtSuitabilityMultiplier` (default `0.9`) so neutral sites can outrank labeled home courts while keeping travel fairness transparent.

## Home-court rules

- `VenueRecord.affiliatedPartyId` matching a participant `partyId` → `homeCourt: true`.
- `participant.homeVenueIds` contains `venue.id` → `homeCourt: true`.
- Explanation string appends a clear note when `homeCourt` is set.

## Sample request / response

**Request** (abbreviated):

```json
{
  "sport": "basketball",
  "participants": [
    {
      "partyId": "user_a",
      "location": { "lat": 40.73, "lng": -73.99 },
      "maxTravelDistanceKm": 12,
      "homeVenueIds": ["riverside_1"]
    },
    {
      "partyId": "user_b",
      "location": { "lat": 40.75, "lng": -74.0 },
      "maxTravelDistanceKm": 12
    }
  ],
  "venues": [
    {
      "id": "central_gym",
      "name": "Downtown Gym",
      "location": { "lat": 40.741, "lng": -73.995 },
      "sports": ["basketball"],
      "venueType": "facility",
      "isPublic": false,
      "qualityScore": 0.82,
      "scheduleKnown": true,
      "indoorCapable": true,
      "outdoorCapable": false,
      "hasLighting": true,
      "parkingScore": 0.55,
      "priceBand": "mid"
    }
  ],
  "preferences": {
    "preferredRadiusKm": 8,
    "preferredVenueTypes": ["court", "facility"],
    "timeWindowUtc": { "weekday": 3, "startMinute": 1080, "endMinute": 1320 },
    "publicPrivate": "either",
    "priceSensitivity": "budget",
    "parkingImportance": 0.4,
    "lightingImportance": 0.5,
    "indoorOutdoor": "indoor"
  },
  "now": "2026-04-22T20:15:00.000Z"
}
```

**Response** (shape):

```json
{
  "sport": "basketball",
  "centroid": { "lat": 40.74, "lng": -73.995 },
  "generatedAt": "2026-04-22T20:15:00.000Z",
  "venues": [
    {
      "venueId": "central_gym",
      "name": "Downtown Gym",
      "location": { "lat": 40.741, "lng": -73.995 },
      "travels": [
        { "partyId": "user_a", "distanceKm": 1.22, "estimatedTimeMinutes": 2.6 },
        { "partyId": "user_b", "distanceKm": 1.18, "estimatedTimeMinutes": 2.5 }
      ],
      "totalTravelKm": 2.4,
      "travelImbalanceKm": 0.04,
      "centralityScore": 0.91,
      "fairnessScore": 0.97,
      "suitabilityScore": 0.78,
      "preferenceMatchScore": 0.72,
      "sportCompatibilityScore": 1,
      "availabilityConfidence": 0.88,
      "homeCourt": false,
      "explanation": "Downtown Gym (facility, basketball): ...",
      "featureBreakdown": { }
    }
  ]
}
```

## Tests

`tests/venue.test.ts` covers centroid, fairness helpers, home-court detection, sport filtering, feasibility filtering, ranking bias toward central fair sites, home-court suitability penalty, and explanation hooks.

## Run

```bash
npm test
npm run dev:api
```

- Combined server (matchmaking + venue): `POST http://localhost:3000/v1/venue-discovery/rank`
- Venue-only dev server: `npm run dev:api:venue` → default port **3001**
