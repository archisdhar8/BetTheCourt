# Application flows (orchestration)

Thin coordination layer under `src/application/`. Each flow calls existing domain services in a documented order and emits in-app notifications. **Domain rules stay inside** `challenges`, `wallet`, `scheduling`, `results`, `fraud`, `ranking`, and `notifications` — flows do not re-validate lifecycle transitions beyond composing calls.

## Modules

| File | Responsibility |
|------|------------------|
| `model.ts` | `ApplicationDeps`, shared input types, `counterpartyPartyId` helper |
| `createChallengeFlow.ts` | Create challenge → optional venue → `challenge_received` |
| `acceptAndFundChallengeFlow.ts` | Accept → lock both stakes → `challenge_accepted` / `funds_locked` |
| `confirmScheduleFlow.ts` | `SchedulingService.confirmSlot` → `schedule_confirmed` when state becomes `scheduled` |
| `submitAndResolveResultFlow.ts` | Submit / confirm / dispute wrappers + matching notifications |
| `payoutAndRankFlow.ts` | `WalletService.payoutChallengeEscrow` (fraud gate inside wallet) → ranking → notifications |

## Dependency bundle

Construct the same services as `src/http/server.ts` (in-memory repos for local tests), then pass them as `ApplicationDeps`:

```typescript
import type { ApplicationDeps } from "../src/application/model.js";

// Same construction order as `buildApiServer()` — challenges → results → checkin → fraud → ranking → wallet → scheduling → notifications
const deps: ApplicationDeps = {
  challenges,
  wallet,
  scheduling,
  results,
  fraud,
  ranking,
  notifications,
};
```

## Calling flows from HTTP (later)

Keep route handlers thin: parse body, build actors, call one flow, map domain errors to status codes.

### Create challenge

```typescript
// POST /v1/challenges (example)
app.post("/v1/challenges", async (req, reply) => {
  const body = req.body as CreateChallengeFlowInput;
  const out = await createChallengeFlow(deps, body);
  return reply.code(201).send(out.challenge);
});
```

**Sample response:** `201` with the persisted `Challenge` JSON (same as today’s challenge module).

### Accept + fund

```typescript
// POST /v1/challenges/:id/accept-and-fund (example composite route)
app.post("/v1/challenges/:id/accept-and-fund", async (req, reply) => {
  const { opponentPartyId, idempotencyKeys } = req.body as AcceptAndFundChallengeFlowInput;
  const out = await acceptAndFundChallengeFlow(deps, {
    challengeId: req.params.id,
    opponentPartyId,
    idempotencyKeys,
  });
  return out.challenge;
});
```

Clients supply **separate** idempotency keys per escrow lock so retries cannot double-lock.

### Confirm schedule

```typescript
app.post("/v1/challenges/:id/schedule/confirm-slot", async (req, reply) => {
  return confirmScheduleFlow(deps, {
    challengeId: req.params.id,
    actor: req.body.actor,
    slotId: req.body.slotId,
  });
});
```

### Results

Split endpoints map naturally to the three functions:

- `submitResultFlow` after `POST .../results/submit`
- `confirmResultFlow` after `POST .../results/confirm`
- `disputeResultFlow` after `POST .../results/dispute`

### Payout + rank

```typescript
app.post("/v1/challenges/:id/payout-and-rank", async (req, reply) => {
  return payoutAndRankFlow(deps, {
    challengeId: req.params.id,
    winnerUserId: req.body.winnerUserId,
    platformFeeMinor: req.body.platformFeeMinor,
    idempotencyKey: req.headers["idempotency-key"] as string,
  });
});
```

## Idempotency

| Concern | Guidance |
|--------|----------|
| Wallet locks / payout | Always forward stable `idempotencyKey` values from the client or job envelope into `WalletService`. Replays return the same result without duplicating ledger rows. |
| `payoutAndRankFlow` celebrations | In-app `payout_completed` / `ranking_updated` notifications are emitted only when `RankingService.applyRankingFromConfirmedChallenge` returns `applied: true`, so a **wallet payout replay** with an already-applied ranking does not spam duplicate celebration toasts. |
| Schedule / results | Idempotency is already handled inside `SchedulingService` / `ResultsService` (e.g. duplicate confirm of the same slot). Flows compare challenge state before/after to avoid duplicate schedule notifications. |
| At-least-once HTTP | Composite routes should either rely on wallet keys only for money side-effects, or add an application-level idempotency store for “accept-and-fund” if you need exactly-once semantics across accept + two locks. |

## Failure modes (pass-through)

Flows intentionally **rethrow** domain errors after optional notification side effects:

- `payoutAndRankFlow` on `fraud_payout_blocked`: emits `fraud_hold` to both participants, then rethrows `WalletDomainError` so the API can return `409`.

Ranking is applied **after** a successful payout. If ranking were to fail after payout (rare operational bug), money state would already be `paid_out`; recovery would be manual or a compensating admin job — not hidden inside the flow.

## Tests

See `tests/application-flows.test.ts` for happy paths (create → fund → schedule → results → payout) and blocked paths (insufficient funds, schedule before funded, fraud payout block, idempotent payout replay).
