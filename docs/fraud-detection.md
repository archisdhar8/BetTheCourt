# Fraud detection (MVP)

Deterministic, **rules-based** fraud scoring for money-backed challenges. Evaluations are **stored separately** from challenges, wallets, check-ins, and result bundles. The module returns a **normalized score (0–1)**, **triggered signals**, **recommended action**, and **`payoutEligible`** for treasury automation.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/fraud/model.ts` | Signal IDs, `FraudEvaluationRecord`, `PartyFraudStats`, `evaluateDeterministicRules`, `FraudDomainError` |
| `src/fraud/repository.ts` | `FraudRepository` + in-memory evaluations, snapshots, party stats |
| `src/fraud/service.ts` | Assembles inputs from `ChallengeService` + `CheckinService` + repo history; `evaluate` persists; `assertPayoutAllowed` runs rules **without** persisting (wallet path) |
| `src/fraud/contract.ts` | Zod for `POST .../fraud/evaluate` |
| `src/fraud/http/register.ts` | Fastify routes |

## ML / anomaly roadmap

Keep `FraudEvaluationRecord` append-only. Later: add `mlScore`, `modelVersion`, or a child table without changing wallet integration — `assertPayoutAllowed` can call a scorer plugin after rules.

## Inputs (conceptual)

- Current **challenge** (state, `result`, parties, `createdAt`, schedule/venue flags)
- **Check-in status** (`CheckinService.getCheckInStatus`)
- **Historical snapshots** (`ChallengeHistorySnapshot[]` in repo) — same pair frequency, fast repeats, winner streaks
- **Party stats** (`PartyFraudStats`) — disputes vs completed, refund/cancel counts
- **Context** — `standard` vs `payout_attempt` (adds a small “no prior evaluation on file” hint when risk already elevated)

Result verification bundles can be folded in later (e.g. dispute rounds) without changing HTTP.

## Outputs

- `fraudScore` — 0..1 (capped sum of signal weights)
- `signals[]` — `{ id, weight, detail? }` (includes zero-weight placeholders when requested)
- `recommendedAction` — `allow` | `flag` | `hold_payout` | `manual_review`
- `explanation` — short human summary
- `payoutEligible` — `false` for `hold_payout` and `manual_review` bands

## MVP signals

| Signal | Rough meaning |
|--------|----------------|
| `repeated_same_pair_matches` | Many prior challenges for the same two party IDs |
| `repeated_same_winner_pattern` | Long streak of the same `winnerPartyId` on snapshots |
| `no_valid_checkins` | Confirmed/paid path without dual valid check-ins |
| `only_one_party_checked_in` | One side valid, the other not |
| `result_without_presence_confidence` | Confirmed outcome without strong presence |
| `high_dispute_rate` | Party-level disputes / (disputes + confirmed) |
| `excessive_refunds_or_cancellations` | Large refund/cancel counts |
| `suspicious_fast_repeat_matches` | Same pair with starts &lt; 6h apart |
| `payout_attempt_before_low_risk_clearance` | Payout-time run with no prior persisted evaluation and moderate raw risk |
| `home_court_bias_pattern` | Optional placeholder (`emitPlaceholderSignals`) |

Thresholds map score → action (see `evaluateDeterministicRules` in `model.ts`).

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/challenges/:id/fraud` | `{ "latest": FraudEvaluationRecord \| null }` |
| `POST` | `/v1/challenges/:id/fraud/evaluate` | Optional body `{ "context"?, "emitPlaceholderSignals"? }` — **persists** a new evaluation row |

## Sample `POST /fraud/evaluate`

```http
POST /v1/challenges/ch_abc/fraud/evaluate
Content-Type: application/json

{
  "context": "standard",
  "emitPlaceholderSignals": false
}
```

**Response (trimmed)**

```json
{
  "challengeId": "ch_abc",
  "evaluatedAt": "2026-04-22T12:00:00.000Z",
  "version": 1,
  "fraudScore": 0.18,
  "signals": [
    { "id": "no_valid_checkins", "weight": 0.1, "detail": "confirmed_without_dual_valid_checkin" },
    { "id": "result_without_presence_confidence", "weight": 0.08 }
  ],
  "recommendedAction": "flag",
  "explanation": "Triggered: no_valid_checkins, result_without_presence_confidence.",
  "payoutEligible": true,
  "context": "standard"
}
```

## Wallet integration

`WalletService.payoutChallengeEscrow` calls `FraudService.assertPayoutAllowed` **before** ledger payout rows when a `FraudService` is wired. On block, clients receive **`fraud_payout_blocked`** (`WalletDomainError`) with fraud details in `details`.

`assertPayoutAllowed` does **not** append an evaluation row (avoids spamming the audit table on retries). Operators can **`POST .../fraud/evaluate`** to persist snapshots for compliance.

## Persistence (Postgres direction)

- `fraud_evaluations(challenge_id, version, payload_jsonb, evaluated_at)`
- `fraud_challenge_snapshots` for historical features
- `fraud_party_stats` materialized or updated by domain events

## Tests

See `tests/fraud.test.ts`.
