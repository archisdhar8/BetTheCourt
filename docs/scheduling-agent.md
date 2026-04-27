# Scheduling Agent

Deterministic negotiation of match time slots for challenges, with Fastify routes and an in-memory repository (`SchedulingRepository` port for Postgres later).

## Rules (summary)

1. **Propose / counter-propose** — allowed while the challenge is **`accepted`** or **`funded`** (not yet `scheduled`+). Countering supersedes the current **pending** proposal.
2. **Final confirmation** — requires **`funded`**, a **`venueId`** on the challenge, a **non-expired** pending proposal, and **both** parties confirming the **same `slotId`**.
3. **Challenge transition** — when both confirm, `SchedulingService` calls `ChallengeService.applyAgentScheduleConfirmation`, which applies **`funded → scheduled`** with FSM action **`confirm_schedule_agent`** (system actor) and copies the chosen slot onto `challenge.scheduleProposal`.
4. **Expiration** — `POST .../schedule/expire` marks pending proposals with `expiresAt <= asOf` as **`expired`** (cron-friendly).
5. **Travel buffer** — optional `travelBufferMinutes` extends each slot’s `effectiveEndAt` deterministically; optional lat/lng points populate `estimatedMaxTravelKm` (Haversine) for future reminder/no-show logic.

## Architecture

| File | Role |
|------|------|
| `model.ts` | `TimeSlot`, `ScheduleProposalRecord`, `ScheduleSession`, `ScheduleView`, errors |
| `repository.ts` | `SchedulingRepository`, `InMemorySchedulingRepository` |
| `service.ts` | `SchedulingService`, `haversineKm`, slot building |
| `contract.ts` | Zod bodies (reuses `actorSchema` from challenges) |
| `http/register.ts` | Fastify routes + `ChallengeDomainError` / `SchedulingDomainError` mapping |

## HTTP API

### `GET /v1/challenges/:id/schedule`

Returns `ScheduleView`: proposals (newest first), `activePendingProposal`, `confirmedSlot`, `venueId`, `fundingReady`, `challengeState`.

### `POST /v1/challenges/:id/schedule/propose`

**Request**

```json
{
  "actor": { "kind": "party", "partyId": "p_creator" },
  "slots": [
    { "startAt": "2026-06-01T14:00:00.000Z", "endAt": "2026-06-01T16:00:00.000Z", "note": "After work" }
  ],
  "expiresAt": "2026-06-05T23:59:59.000Z",
  "travelBufferMinutes": 30,
  "venue": { "lat": 40.7128, "lng": -74.006 },
  "creatorLocation": { "lat": 40.73, "lng": -73.99 },
  "opponentLocation": { "lat": 40.68, "lng": -73.95 }
}
```

**Response** `200` — `ScheduleView` JSON.

Also mirrors the **first** slot onto `GET /v1/challenges/:id` as `scheduleProposal` for backward-compatible reads.

### `POST /v1/challenges/:id/schedule/counter`

Same body as **propose**; supersedes the active pending proposal.

### `POST /v1/challenges/:id/schedule/confirm`

**Request**

```json
{
  "actor": { "kind": "party", "partyId": "p_opponent" },
  "slotId": "slot_…"
}
```

**Response** `200` — `ScheduleView`. When the second party confirms the same `slotId`, the challenge becomes **`scheduled`**.

**Errors:** `funding_required`, `venue_required`, `proposal_expired`, `slot_mismatch`, `forbidden_actor`, …

### `POST /v1/challenges/:id/schedule/cancel`

**Request** `{ "actor": { "kind": "party", "partyId": "p_creator" } }` — cancels the active pending proposal.

### `POST /v1/challenges/:id/schedule/expire`

**Request** `{ "asOf": "2026-06-10T12:00:00.000Z" }` (optional; defaults to now).

**Response** `200` — `ScheduleView`.

---

## Challenge integration

Legacy **`POST /v1/challenges/:id/schedule/propose`** and **`.../confirm`** on the challenge router were **removed**. Use this agent’s routes so funding, venue, and FSM transitions stay consistent.

See `docs/challenge-lifecycle.md` for the updated lifecycle table (`confirm_schedule_agent`).

## Tests

`tests/scheduling.test.ts` — multi-slot propose, counter-propose, venue + funding gates, slot mismatch, expiration, forbidden actor, Haversine sanity.

`tests/challenges.test.ts` — full match flow uses `SchedulingService` for the `scheduled` transition.
