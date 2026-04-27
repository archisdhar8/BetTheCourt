# Result Verification Agent (MVP)

Deterministic, sport-aware match **result submission** and **peer verification** for challenges. Verification **rounds** and **per-party decisions** live in the results store; the **`Challenge`** aggregate keeps FSM state, `result`, and `completedByPartyId` (see `src/challenges/service.ts`).

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/results/model.ts` | Types, `ResultsDomainError`, `canonicalResultFingerprint`, `assertSportResultPayload` (extension hook) |
| `src/results/repository.ts` | `ResultsRepository` port + `InMemoryResultsRepository` |
| `src/results/service.ts` | Orchestration: submit → `complete_match`, confirm/dispute → challenge FSM, persist rounds |
| `src/results/contract.ts` | Zod bodies for HTTP |
| `src/results/http/register.ts` | Fastify routes + error mapping (`ResultsDomainError`, `ChallengeDomainError`) |

## State & payout / ranking

- **`completed`**: result submitted (`complete_match`); opponent may **confirm** or **dispute** via results API.
- **`confirmed`**: both sides aligned on the same payload (non-submitter confirmed); **`canInitiatePayout`** and **`canRecordRanking`** become true.
- **`disputed`**: opponent disagreed; **payout and ranking stay blocked** until admin **`POST /v1/challenges/:id/resolve-dispute`** (unchanged challenge route).

## Submit policy

- **Submit** is allowed only while the challenge is **`scheduled`** (the spec also names `completed` for a broader “outcome phase”; in this MVP **`completed`** means a result is already recorded—use **confirm** / **dispute**, not a second submit).
- **`assertSportResultPayload`** currently ensures a non-empty sport string and a JSON object payload; add sport-specific Zod (or JSON Schema) branches here later.

## Deterministic comparison

`canonicalResultFingerprint` sorts object keys recursively so two logically equal payloads produce the same digest. Optional **`ackFingerprint`** on confirm must match the active round’s fingerprint or the API returns **`payload_mismatch`**.

## Future hooks

- **`ResultVerificationBundle.extensions`**: attach evidence URIs, dispute deadlines, or audit metadata without changing core tables.
- **Timeouts**: enforce “confirm by T” in a worker that reads bundles and applies transitions (not in MVP).

## HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/challenges/:id/results` | Current challenge state + verification rounds |
| `POST` | `/v1/challenges/:id/results/submit` | Party submits `{ "actor", "payload" }` → `scheduled → completed` |
| `POST` | `/v1/challenges/:id/results/confirm` | Other party agrees `{ "actor", "note?", "ackFingerprint?" }` → `completed → confirmed` |
| `POST` | `/v1/challenges/:id/results/dispute` | Other party disagrees `{ "actor", "reason", "counterPayload?" }` → `completed → disputed` |

Legacy challenge routes **`/complete`**, **`/confirm-result`**, and **`/dispute`** were removed; use the table above.

## Sample requests

**Submit (from `scheduled`)**

```http
POST /v1/challenges/ch_abc/results/submit
Content-Type: application/json
```

```json
{
  "actor": { "kind": "party", "partyId": "p_creator" },
  "payload": {
    "winnerPartyId": "p_creator",
    "sets": ["6-4", "3-6", "6-1"]
  }
}
```

**Response (trimmed)**

```json
{
  "challengeId": "ch_abc",
  "challengeState": "completed",
  "activeRound": {
    "status": "pending",
    "fingerprint": "<opaque digest from canonicalResultFingerprint>",
    "submittedByPartyId": "p_creator",
    "payload": { "winnerPartyId": "p_creator", "sets": ["6-4", "3-6", "6-1"] }
  },
  "rounds": [ "..." ]
}
```

**Confirm**

```json
{
  "actor": { "kind": "party", "partyId": "p_opponent" },
  "note": "Looks good",
  "ackFingerprint": "<copy from activeRound.fingerprint>"
}
```

**Dispute**

```json
{
  "actor": { "kind": "party", "partyId": "p_opponent" },
  "reason": "Wrong set score in set 2",
  "counterPayload": { "winnerPartyId": "p_opponent", "sets": ["6-4", "6-3", "6-1"] }
}
```

## Errors (`ResultsDomainError`)

| Code | Typical HTTP |
|------|----------------|
| `not_found` | 404 (from challenge load) |
| `forbidden_actor` | 403 |
| `challenge_not_resultable` | 409 |
| `self_confirm_forbidden` | 403 |
| `no_pending_round` | 409 |
| `already_decided` | 409 |
| `payload_mismatch` | 409 |
| `invalid_payload` | 400 |

## Persistence

Swap `InMemoryResultsRepository` for Postgres: one row per challenge (`challenge_id` PK) with JSONB `rounds` mirroring `ResultVerificationBundle`, or normalized `result_verification_rounds` + `result_party_decisions` tables.

## Tests

See `tests/results.test.ts` (service + HTTP smoke).
