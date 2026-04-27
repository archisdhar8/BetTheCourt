# Matchmaking Agent

## Architecture

- **Contracts (`src/matchmaking/contract.ts`)**: Zod schemas for HTTP request validation; keeps API payloads aligned with domain types.
- **Domain model (`src/matchmaking/model.ts`)**: Seeker profiles (user/team), candidates (user/team), outputs, and tunable config types.
- **Scoring (`src/matchmaking/scoring.ts`)**: Deterministic feature extraction (distance, skill fit, activity, stake overlap, trust, availability overlap, rematch flag) and composite formulas.
- **Service (`src/matchmaking/service.ts`)**: Orchestrates filtering, scoring, ranking, and explanation assembly; optional async `explanationHook` for AI rewrites.
- **Explanations (`src/matchmaking/explanations.ts`)**: Template-based explanations; `withAiExplanation` wraps a provider `(prompt) => string`.
- **Optional AI (`src/matchmaking/aiExplanation.ts`)**: OpenAI Chat Completions rewrite when `OPENAI_API_KEY` is set.
- **HTTP (`src/matchmaking/http/server.ts`)**: Fastify server exposing `POST /v1/matchmaking/recommend`.

Data flow: **HTTP → Zod parse → `recommendMatches` → ranked `MatchmakingResult`**.

## Scoring logic (deterministic)

For each candidate, compute raw features:

- **Distance**: Haversine km vs seeker; hard filter if `distanceKm > maxTravelDistanceKm`.
- **Distance score**: `clamp01(1 - distanceKm / maxTravelKm)`.
- **Skill fit**: `clamp01(1 - |Δskill| / skillRatingBand)`.
- **Activity**: exponential decay from `lastActiveAt` with half-life `activityHalfLifeHours`.
- **Stake overlap**: overlap of minor-unit ranges normalized by seeker span; **0** if currency mismatch.
- **Trust composite**: `0.65 * trust/100 + 0.35 * verification/100`.
- **Availability overlap**: overlap of UTC minute windows for “today’s” weekday vs `now` (MVP).
- **Rematch**: if seeker lists past opponent id/team id and rivalry mode is off, mark penalty (used as a low-weighted dimension score).

**Match quality** is a weighted linear blend of the above (with rematch mapped to a low score when penalized), plus a small availability boost, clamped to `[0,1]`.

**Fairness confidence** is a geometric mean of skill fit, trust, and travel headroom.

**Acceptance likelihood** is a heuristic combining match quality, trust, stake tension, skill tension, and rematch—**not** a calibrated ML model.

## API contract

`POST /v1/matchmaking/recommend`

- **Body**: `matchmakingRequestSchema` in `src/matchmaking/contract.ts`
- **200**: `MatchmakingResult` (`src/matchmaking/model.ts`)
- **400**: `{ error: "invalid_request", details: ... }`

Optional AI explanations:

- Request: `options.useAiExplanations: true`
- Server: requires `OPENAI_API_KEY` (see `src/matchmaking/http/server.ts`)

## Sample input/output

Request (abbreviated):

```json
{
  "seeker": {
    "kind": "user",
    "userId": "u_1",
    "sport": "basketball",
    "location": { "lat": 40.7128, "lng": -74.006 },
    "maxTravelDistanceKm": 25,
    "skillRating": 30,
    "wins": 10,
    "losses": 8,
    "preferredStake": { "currency": "USD", "minMinor": 1000, "maxMinor": 5000 },
    "preferredFormats": ["1v1"],
    "availabilityUtc": [{ "weekday": 3, "startMinute": 1080, "endMinute": 1320 }],
    "pastOpponentIds": [],
    "trustScore": 80,
    "verificationScore": 70,
    "lastActiveAt": "2026-04-22T12:00:00.000Z"
  },
  "candidates": [
    {
      "party": "user",
      "userId": "u_2",
      "sport": "basketball",
      "location": { "lat": 40.6782, "lng": -73.9442 },
      "skillRating": 31,
      "wins": 5,
      "losses": 5,
      "preferredStake": { "currency": "USD", "minMinor": 2000, "maxMinor": 6000 },
      "preferredFormats": ["1v1"],
      "availabilityUtc": [{ "weekday": 3, "startMinute": 1140, "endMinute": 1260 }],
      "trustScore": 75,
      "verificationScore": 65,
      "lastActiveAt": "2026-04-22T11:00:00.000Z"
    }
  ],
  "now": "2026-04-22T20:00:00.000Z"
}
```

Response (abbreviated):

```json
{
  "seeker": { "party": "user", "userId": "u_1" },
  "sport": "basketball",
  "generatedAt": "2026-04-22T20:00:00.000Z",
  "recommendations": [
    {
      "opponent": { "party": "user", "userId": "u_2" },
      "matchQualityScore": 0.83,
      "fairnessConfidence": 0.77,
      "acceptanceLikelihood": 0.71,
      "explanation": "User u_2 is recommended ...",
      "featureBreakdown": {
        "distanceKm": 6.47,
        "distanceScore": 0.74,
        "skillDelta": 1,
        "skillFitScore": 0.875,
        "activityScore": 0.78,
        "availabilityScore": 0.5,
        "stakeOverlapScore": 0.75,
        "trustScore": 0.71,
        "rematchPenaltyApplied": false,
        "formatOverlap": true
      }
    }
  ]
}
```

## Test plan

Automated (`tests/matchmaking.test.ts`):

- Haversine sanity
- Activity edge: invalid timestamps
- Stake overlap currency mismatch
- Availability non-overlap
- Filtering: self, wrong sport, too far, incompatible formats
- Ranking: closer/better skill beats worse
- Rematch penalty vs fresh opponent
- Rivalry mode disables rematch penalty
- Team candidates excluded for user seekers
- Optional explanation hook

Manual / future:

- Load test candidate pools (hundreds) for latency
- Golden files for scoring snapshots across weight presets
- Property tests for monotonicity (closer → not lower distance score, all else equal)

## Run

```bash
npm install
npm test
npm run dev:api
```

`dev:api` runs the combined server (`src/http/server.ts`), which includes matchmaking **and** venue-discovery routes. Use `npm run dev:api:matchmaking` for matchmaking-only.

Environment (optional AI):

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
