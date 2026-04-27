# Challenge domain & lifecycle

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/challenges/model.ts` | States, actors, `Challenge` aggregate shape, domain errors, `canInitiatePayout` / `canRecordRanking` |
| `src/challenges/stateMachine.ts` | Declarative transition rules, guards (`assertTransition`, `assertActorAllowed`), `applyTransition` + history append |
| `src/challenges/service.ts` | Orchestration, escrow flags, `applyAgentScheduleConfirmation` (called from scheduling agent), anti-collusion on result confirm, persistence via repository port |
| `src/scheduling/` | Schedule proposals, counters, confirmations, expiration (`docs/scheduling-agent.md`) |
| `src/challenges/repository.ts` | `ChallengeRepository` interface + `InMemoryChallengeRepository` (swap for Postgres) |
| `src/challenges/contract.ts` | Zod request bodies (shared with OpenAPI generation later) |
| `src/challenges/http/register.ts` | Fastify routes + `ChallengeDomainError` mapping |
| `src/results/` | Result verification rounds, confirm/dispute HTTP (`docs/result-verification-agent.md`) |
| `src/checkin/` | Presence check-in near venue + time window (`docs/checkin-module.md`) |
| `src/fraud/` | Rules-based fraud scoring + payout gate (`docs/fraud-detection.md`) |
| `src/ranking/` | ELO ratings & leaderboards (`docs/ranking-leaderboard.md`) |
| `src/notifications/` | In-app user notifications (`docs/notifications-module.md`) |

## States (MVP)

`draft` → `pending` → `accepted` → `funded` → `scheduled` → `completed` → `confirmed` → `paid_out`  

Branches: `disputed`, `refunded`, `cancelled` (terminals with `paid_out`).

## Transition rules (deterministic)

Authoritative list: `RULES` in `src/challenges/stateMachine.ts`.

Summary:

| From | Action | To | Actors |
|------|--------|-----|--------|
| `draft` | `submit` | `pending` | creator |
| `draft` | `cancel` | `cancelled` | creator |
| `pending` | `accept` | `accepted` | opponent |
| `pending` | `decline` | `cancelled` | opponent |
| `pending` | `cancel` | `cancelled` | creator |
| `accepted` | `funds_locked` | `funded` | **system** (applied by service once both wallet flags are true) |
| `accepted` | `cancel` | `cancelled` | creator |
| `funded` | `confirm_schedule_agent` | `scheduled` | **system** (via `SchedulingService` after both parties confirm the same slot; venue required) |
| `funded` | `cancel` | `refunded` | admin |
| `scheduled` | `complete_match` | `completed` | creator, opponent |
| `scheduled` | `cancel` | `refunded` | admin |
| `completed` | `confirm_result` | `confirmed` | creator, opponent (service forbids same party as submitter) |
| `completed` | `dispute` | `disputed` | creator, opponent |
| `disputed` | `resolve_dispute_confirmed` | `confirmed` | admin |
| `disputed` | `resolve_dispute_refund` | `refunded` | admin |
| `confirmed` | `finalize_payout` | `paid_out` | system |

### Funding (wallet / escrow)

- `Challenge` tracks **`creatorFundsLocked`** and **`opponentFundsLocked`** (defaults `false` on create).
- **Only** the wallet agent may advance funding: **`POST /v1/challenges/:id/escrow/lock`** (see `docs/wallet-agent.md`) moves stake on the ledger, then calls internal `ChallengeService.recordPartyFundsLocked` so flags and money stay aligned.
- When **both** sides are locked on the ledger and in the aggregate, the domain applies **`accepted → funded`** with FSM action **`funds_locked`** and a **system** actor on the transition record. This transition is **not** exposed as its own challenge HTTP route.
- Scheduling is **decoupled**: `schedule/propose` never changes funding state.

### Scheduling

Handled by the **Scheduling agent** (`src/scheduling/`, `docs/scheduling-agent.md`):

1. **`POST /v1/challenges/:id/schedule/propose`** — one or more slots + `expiresAt` (from **`accepted`** or **`funded`**). Mirrors the first slot onto `challenge.scheduleProposal` for reads.
2. **`POST .../schedule/counter`** — same payload; supersedes pending.
3. **`POST .../schedule/confirm`** — party confirms a `slotId`; when **both** agree on the same slot and the challenge is **`funded`** with **`venueId`**, **`funded → scheduled`** runs (`confirm_schedule_agent`).
4. **`POST .../schedule/cancel`** / **`POST .../schedule/expire`** — negotiation hygiene.

### Payout & ranking guards

- **`canInitiatePayout`**: only `confirmed` → `paid_out` via **`POST /v1/challenges/:id/payout`** with `{ "actor": { "kind": "system" } }` (worker / treasury job).
- **`canRecordRanking`**: `confirmed` or `paid_out` only — **`disputed` blocks ranking** (and payout).

## HTTP API

Core (user-requested):

- `POST /v1/challenges` — create (`initialState`: `draft` \| `pending`, default `pending`)
- `GET /v1/challenges/:id`
- `POST /v1/challenges/:id/accept`
- `POST /v1/challenges/:id/decline`
- `POST /v1/challenges/:id/cancel`
- `PATCH /v1/challenges/:id/venue`

**Results (result verification agent)** — `docs/result-verification-agent.md`:

- `GET /v1/challenges/:id/results`
- `POST /v1/challenges/:id/results/submit`
- `POST /v1/challenges/:id/results/confirm`
- `POST /v1/challenges/:id/results/dispute`

**Check-in / presence** — `docs/checkin-module.md`:

- `GET /v1/challenges/:id/checkin`
- `POST /v1/challenges/:id/checkin`

**Fraud** — `docs/fraud-detection.md`:

- `GET /v1/challenges/:id/fraud`
- `POST /v1/challenges/:id/fraud/evaluate`

**Ranking** — `docs/ranking-leaderboard.md`:

- `GET /v1/leaderboards/:sport?window=all_time|weekly`
- `GET /v1/users/:userId/ranking/:sport`
- `POST /v1/challenges/:id/ranking/apply`

**Notifications** — `docs/notifications-module.md`:

- `GET /v1/users/:userId/notifications?unreadOnly=true|false`
- `POST /v1/users/:userId/notifications/:notificationId/read`
- `POST /v1/users/:userId/notifications/read-all`

Additional (required for coherent MVP):

- `POST /v1/challenges/:id/submit` — `draft → pending` (creator)
- `POST /v1/challenges/:id/resolve-dispute` — admin `{ "resolution": "confirm" \| "refund", "actor": { "kind": "admin", "adminId": "..." } }`
- `POST /v1/challenges/:id/payout` — `{ "actor": { "kind": "system" } }` only

Wallet (funding / escrow; not under `challenges/` routes in code but part of the combined API):

- `POST /v1/challenges/:id/escrow/lock` — canonical path to lock stake and advance funding when both sides are ready (`docs/wallet-agent.md`)

Scheduling (`src/scheduling/http/register.ts`):

- `GET /v1/challenges/:id/schedule`
- `POST /v1/challenges/:id/schedule/propose`
- `POST /v1/challenges/:id/schedule/counter`
- `POST /v1/challenges/:id/schedule/confirm`
- `POST /v1/challenges/:id/schedule/cancel`
- `POST /v1/challenges/:id/schedule/expire`

### Actor envelope

All mutating routes expect an `actor` field:

```json
{ "kind": "party", "partyId": "p_creator" }
```

```json
{ "kind": "system" }
```

```json
{ "kind": "admin", "adminId": "support_1" }
```

## Sample requests

**Create (pending by default)**

```http
POST /v1/challenges
Content-Type: application/json

{
  "sport": "basketball",
  "mode": "1v1",
  "creatorPartyId": "user_a",
  "opponentPartyId": "user_b",
  "stakeMinor": 5000,
  "currency": "USD"
}
```

**Accept**

```json
{ "actor": { "kind": "party", "partyId": "user_b" } }
```

**Record escrow lock (once per side; ledger + challenge aggregate)**

```http
POST /v1/challenges/ch_.../escrow/lock
Content-Type: application/json

{
  "userId": "user_a",
  "idempotencyKey": "lock-ch_...-user_a-1"
}
```

Repeat for `user_b` with a distinct idempotency key. When both stakes are locked on the ledger, the challenge becomes **`funded`** and the transition log includes `action: "funds_locked"` (system actor).

**Propose schedule slots (scheduling agent)**

```http
POST /v1/challenges/ch_.../schedule/propose
Content-Type: application/json
```

```json
{
  "actor": { "kind": "party", "partyId": "user_a" },
  "slots": [
    {
      "startAt": "2026-05-10T22:00:00.000Z",
      "endAt": "2026-05-10T23:30:00.000Z",
      "note": "Court 2"
    }
  ],
  "expiresAt": "2026-05-12T23:59:59.000Z"
}
```

Set venue (`PATCH /v1/challenges/:id/venue`) before final confirmation. Each party **`POST .../schedule/confirm`** with the same `slotId` while **`funded`**.

**Payout (system)**

```json
{ "actor": { "kind": "system" } }
```

## Errors

`ChallengeDomainError` → HTTP status + `{ error, message, details }`:

- `not_found` — 404  
- `invalid_transition` — 409  
- `forbidden_actor` — 403  
- `payout_blocked` — 409  
- `ranking_blocked` — 409  

## Persistence

`ChallengeRepository` is intentionally small (`create`, `getById`, `save`). Replace `InMemoryChallengeRepository` with a Postgres implementation + optimistic locking on version column when ready.

## Tests

See `tests/challenges.test.ts` for happy path, dispute, refund, payout guards, and invalid actors. See `tests/results.test.ts` for the results API and verification bundle behavior. See `tests/checkin.test.ts` for check-in validation. See `tests/fraud.test.ts` for fraud scoring and payout blocking. See `tests/ranking.test.ts` for ELO apply and leaderboards. See `tests/notifications.test.ts` for the notification feed.
