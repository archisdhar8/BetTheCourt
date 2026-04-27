# Wallet / Escrow Agent

Deterministic, ledger-first internal wallets for the BetTheCourt challenge lifecycle. All amounts are **integer minor units** (for example, USD cents). There is **no** Stripe or external PSP integration in this layer yet.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `model.ts` | `WalletProfile`, immutable `LedgerEntry`, `WalletBalances`, `WalletDomainError` |
| `ledger.ts` | Pure projection: `projectWalletFromLedger`, builders for each entry type |
| `repository.ts` | Append-only ledger, wallet profiles, idempotency index (`WalletRepository` port) |
| `service.ts` | `WalletService`: credit/debit, challenge escrow lock/refund/payout, challenge integration |
| `contract.ts` | Zod request bodies |
| `http/register.ts` | Fastify routes |

**Postgres later:** replace `InMemoryWalletRepository` with tables `wallets`, `ledger_entries` (with monotonic `sequence` and unique `id`), `idempotency_keys` (`key` unique, `command`, `result` JSONB).

## Ledger rules

1. Every balance change appends one or more `LedgerEntry` rows (never mutate past rows).
2. `projectWalletFromLedger(userId, entries)` recomputes `availableMinor`, `lockedMinor`, and `lockedByChallengeMinor` deterministically.
3. `WalletService` enforces **idempotency** with a client-supplied `idempotencyKey` per command. Reusing a key for a **different** command returns `409` with `duplicate_idempotency_key`.
4. Optional **platform fee** on payout credits `PLATFORM_WALLET_USER_ID` (`__platform__`), auto-created in the challenge currency when needed.

## Challenge integration

- `POST /v1/challenges/:id/escrow/lock` locks one participant’s stake (available → locked for that `challengeId`) and calls `ChallengeService.recordPartyFundsLocked` with the `system` actor so the challenge can move **`accepted` → `funded`** once **both** sides are locked in the challenge aggregate.
- `isChallengeFullyEscrowed(challengeId)` compares **ledger** escrow against the challenge `stakeMinor` for creator and opponent.
- Refund requires challenge state **`refunded`** or **`cancelled`**.
- Payout requires challenge state **`confirmed`** (same gate as `finalizePayout`), then writes ledger rows and advances the challenge to **`paid_out`**.

**Funding rule:** `accepted → funded` is driven only from the wallet module (`POST /v1/challenges/:id/escrow/lock`), which appends ledger rows then calls internal `ChallengeService.recordPartyFundsLocked`. There is **no** public HTTP route on challenges to set funding flags without ledger movement.

---

## API

### `POST /v1/wallets`

Create a wallet for a `userId` (typically the same string as challenge `creatorPartyId` / `opponentPartyId`).

**Request**

```json
{
  "userId": "p_alice",
  "currency": "USD"
}
```

**Response** `201`

```json
{
  "userId": "p_alice",
  "currency": "USD",
  "createdAt": "2026-04-22T12:00:00.000Z"
}
```

---

### `GET /v1/wallets/:userId`

**Response** `200`

```json
{
  "userId": "p_alice",
  "currency": "USD",
  "availableMinor": 5000,
  "lockedMinor": 1000,
  "lockedByChallengeMinor": {
    "ch_…": 1000
  }
}
```

---

### `POST /v1/wallets/:userId/credit`

Internal / admin-style funding for tests and ops (idempotent).

**Request**

```json
{
  "amountMinor": 10000,
  "currency": "USD",
  "idempotencyKey": "seed-alice-001",
  "metadata": { "reason": "test_seed" }
}
```

**Response** `200`

```json
{
  "wallet": {
    "userId": "p_alice",
    "currency": "USD",
    "availableMinor": 10000,
    "lockedMinor": 0,
    "lockedByChallengeMinor": {}
  },
  "ledgerEntryIds": ["le_…"]
}
```

---

### `POST /v1/wallets/:userId/debit`

Debits **available** only (idempotent).

**Request**

```json
{
  "amountMinor": 500,
  "currency": "USD",
  "idempotencyKey": "debit-alice-001"
}
```

**Response** `200` — same shape as credit (`wallet`, `ledgerEntryIds`).

**Errors:** `insufficient_funds` (`409`), `currency_mismatch`, `duplicate_idempotency_key`.

---

### `POST /v1/challenges/:id/escrow/lock`

Locks `stakeMinor` from the participant’s available balance into escrow for this challenge. Challenge must be **`accepted`**.

**Request**

```json
{
  "userId": "p_alice",
  "idempotencyKey": "lock-ch_abc-alice-1"
}
```

**Response** `200`

```json
{
  "wallet": { "userId": "p_alice", "currency": "USD", "availableMinor": 4000, "lockedMinor": 1000, "lockedByChallengeMinor": { "ch_…": 1000 } },
  "challenge": { "id": "ch_…", "state": "accepted", "creatorFundsLocked": true, "…": "…" },
  "ledgerEntryIds": ["le_…"]
}
```

When the **second** participant locks, `challenge.state` becomes **`funded`**.

**Errors:** `insufficient_funds`, `stake_already_locked`, `challenge_not_escrowable`, `forbidden` (user not on challenge), `not_found` (wallet missing).

---

### `POST /v1/challenges/:id/escrow/refund`

Releases all ledger escrow for this challenge back to **available** for each participant. Challenge must be **`refunded`** or **`cancelled`**.

**Request**

```json
{
  "idempotencyKey": "refund-ch_abc-1"
}
```

**Response** `200`

```json
{
  "wallets": [
    { "userId": "p_alice", "currency": "USD", "availableMinor": 5000, "lockedMinor": 0, "lockedByChallengeMinor": {} }
  ],
  "ledgerEntryIds": ["le_…", "le_…"]
}
```

If there was nothing locked, `ledgerEntryIds` may be empty (still idempotent).

---

### `POST /v1/challenges/:id/escrow/payout`

Requires **`confirmed`**, both sides still holding full stake in the ledger for this challenge. Before moving money, the combined API runs **`FraudService.assertPayoutAllowed`** (see `docs/fraud-detection.md`); on elevated risk the route returns **`fraud_payout_blocked`** without mutating the challenge. Releases both locks, credits the winner **net of fee**, credits the platform wallet, then calls `finalizePayout`.

**Request**

```json
{
  "winnerUserId": "p_alice",
  "platformFeeMinor": 100,
  "idempotencyKey": "payout-ch_abc-1"
}
```

**Response** `200`

```json
{
  "wallets": [
    { "userId": "p_alice", "…": "…" },
    { "userId": "p_bob", "…": "…" },
    { "userId": "__platform__", "…": "…" }
  ],
  "ledgerEntryIds": ["le_…", "le_…", "le_…", "le_…"],
  "challenge": { "id": "ch_…", "state": "paid_out" }
}
```

**Errors:** `invalid_payout`, `fraud_payout_blocked`, `already_paid_out` (second payout with a **new** idempotency key after `paid_out`), `duplicate_idempotency_key`, `not_found`.

---

## Error codes (selection)

| Code | Typical HTTP |
|------|----------------|
| `not_found` | 404 |
| `insufficient_funds` | 409 |
| `duplicate_idempotency_key` | 409 |
| `stake_already_locked` | 409 |
| `challenge_not_escrowable` | 409 |
| `invalid_payout` | 409 |
| `fraud_payout_blocked` | 409 |
| `already_paid_out` | 409 |
| `currency_mismatch` | 400 |
| `forbidden` | 403 |

---

## Tests

See `tests/wallet.test.ts` for: happy-path lock + fund, insufficient funds, idempotent credit, idempotency key collision across commands, stake already locked, refund + idempotent replay, payout with fee, double-payout prevention, payout before confirm, refund on cancelled challenge with no locks.
