# Check-in / Presence Verification (MVP)

Modular **presence verification** for scheduled challenges: participants submit GPS coordinates near the selected venue during a configurable time window around the scheduled start. Data is stored **separately** from the `Challenge` aggregate; the service **reads** challenge venue and schedule only.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/checkin/model.ts` | Types, `CheckinDomainError`, `DEFAULT_CHECKIN_POLICY`, distance/time helpers, `noShowRisk` placeholder builder |
| `src/checkin/repository.ts` | `CheckinRepository` + `InMemoryCheckinRepository` |
| `src/checkin/venueProvider.ts` | `VenueLocationProvider` + `InMemoryVenueLocationProvider` (swap for DB-backed resolver) |
| `src/checkin/service.ts` | Validation, persistence, `bothPartiesHaveValidCheckin` / `partyHasValidCheckin` for downstream agents |
| `src/checkin/contract.ts` | Zod request bodies |
| `src/checkin/http/register.ts` | Fastify routes |

## Rules (deterministic)

1. **Actor**: only `party` actors that are `creatorPartyId` or `opponentPartyId`.
2. **Challenge state**: must be **`scheduled`**.
3. **Venue**: `challenge.venueId` required; coordinates from `VenueLocationProvider`.
4. **Schedule**: `challenge.scheduleProposal.startAt` required (ISO UTC).
5. **Time window**: `now` must satisfy  
   `startAt - windowBeforeStartMinutes ≤ now ≤ startAt + windowAfterStartMinutes`  
   (injected `clock` in tests; production uses real time).
6. **Radius**: great-circle distance from user point to venue must be ≤ `maxDistanceMeters`.
7. **Invalid attempts** are still **persisted** with `valid: false` and `invalidReasons` (`outside_time_window`, `outside_radius`).
8. **Duplicate valid check-in**: if the party already has `valid: true` and `allowRecheckin` is false → **`duplicate_checkin`** (409). Invalid prior attempts can be **replaced** by a later valid submission.

## Default policy

Defined in `DEFAULT_CHECKIN_POLICY` (`model.ts`):

- `windowBeforeStartMinutes`: 120  
- `windowAfterStartMinutes`: 240  
- `maxDistanceMeters`: 500  
- `allowRecheckin`: false  

Override per deployment via `new CheckinService(..., policyOverrides)`.

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/challenges/:id/checkin` | Presence status, latest records per party, `bothCheckedInValid`, `noShowRisk` placeholder |
| `POST` | `/v1/challenges/:id/checkin` | Body: `{ "actor", "lat", "lng" }` — submit check-in |

## Sample requests

**Get status**

```http
GET /v1/challenges/ch_abc/checkin
```

**Response (trimmed)**

```json
{
  "challengeId": "ch_abc",
  "challengeState": "scheduled",
  "venueId": "venue_1",
  "scheduledStartAt": "2026-05-01T18:00:00.000Z",
  "policy": {
    "windowBeforeStartMinutes": 120,
    "windowAfterStartMinutes": 240,
    "maxDistanceMeters": 500,
    "allowRecheckin": false
  },
  "creatorPartyId": "p_creator",
  "opponentPartyId": "p_opponent",
  "creator": {
    "partyId": "p_creator",
    "submittedAt": "2026-05-01T17:45:00.000Z",
    "coordinates": { "lat": 40.7593, "lng": -73.9855 },
    "distanceToVenueMeters": 142.5,
    "valid": true,
    "invalidReasons": []
  },
  "opponent": null,
  "bothCheckedInValid": false,
  "noShowRisk": {
    "modelScore": null,
    "hints": []
  }
}
```

**Submit check-in**

```http
POST /v1/challenges/ch_abc/checkin
Content-Type: application/json
```

```json
{
  "actor": { "kind": "party", "partyId": "p_creator" },
  "lat": 40.7593,
  "lng": -73.9855
}
```

Invalid proximity still returns **200** with `creator.valid: false` and `invalidReasons: ["outside_radius"]` (and persists the row). **409** is reserved for policy violations such as `duplicate_checkin`, `challenge_not_scheduled`, `missing_venue`, etc.

## Integration

- **Does not** mutate payout or ranking; no challenge FSM transitions.
- **`ResultsService`** (or workers) may call **`checkin.bothPartiesHaveValidCheckin(challengeId)`** when tightening result confidence or dispute workflows (optional; not wired by default).

## Venue coordinates

`InMemoryVenueLocationProvider` seeds `venue_1`, `venue_test`, `venue_x` (`venueProvider.ts`). Register more IDs at boot or call `setLocation` in tests.

## Persistence (Postgres direction)

- Table `challenge_checkins` keyed by `challenge_id` with JSONB `bundle` mirroring `CheckInBundle`, or normalized `checkin_events` with one row per submission.

## Errors (`CheckinDomainError`)

| Code | HTTP |
|------|------|
| `forbidden_actor` | 403 |
| `challenge_not_scheduled` | 409 |
| `missing_venue` | 409 |
| `missing_schedule` | 409 |
| `venue_location_unknown` | 409 |
| `duplicate_checkin` | 409 |
| `invalid_payload` | 400 |

Challenge `not_found` surfaces as `ChallengeDomainError` (404).

## Tests

See `tests/checkin.test.ts`: valid path, wrong actor, radius, time window, duplicate, retry after invalid, missing venue/schedule, unknown venue, HTTP smoke.
