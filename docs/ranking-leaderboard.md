# Ranking & leaderboard (MVP)

ELO-based **per-user, per-sport** ratings with **wins / losses / streaks** and **leaderboard windows** (`all_time`, `weekly`). All state lives in the **ranking repository** — not in challenges, wallets, results, or fraud aggregates.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/ranking/model.ts` | ELO math, `UserSportRating`, `LeaderboardEntry`, windows, `RankingDomainError` |
| `src/ranking/repository.ts` | `RankingRepository` + in-memory ratings & applications |
| `src/ranking/service.ts` | Apply from confirmed challenges, fraud gate, leaderboard assembly |
| `src/ranking/contract.ts` | Zod for query/body |
| `src/ranking/http/register.ts` | Fastify routes |

## Rules

1. **Eligibility**: `Challenge.state` must satisfy `canRecordRanking` (`confirmed` or `paid_out`) — see `src/challenges/model.ts`.
2. **Disputed**: `disputed` (and other non-confirmed states) never qualify.
3. **Fraud**: if a **latest** fraud evaluation exists for the challenge and `payoutEligible === false`, ranking apply is rejected (`fraud_blocked_ranking`). No evaluation → allowed (ops can evaluate later).
4. **Winner**: read from `challenge.result` via `winnerPartyId` or `winner` (party id), same helper as fraud (`extractWinnerPartyId`).
5. **Idempotency**: one ranking row per `challengeId`; repeat `POST .../ranking/apply` returns `alreadyApplied: true` without changing ELO.
6. **Teams**: `mode === "team"` returns **`team_ranking_not_supported`** (501) until a team extension exists.

## ELO (MVP)

- Start rating **1500**, **K = 32**.
- `computeEloUpdate(ra, rb, scoreA)` with `scoreA ∈ {0,1}` for the first player argument.

## Leaderboard windows

- **`all_time`**: sort by **ELO** desc, then wins, then `userId` (stable tie-break).
- **`weekly`**: primary sort by **wins recorded this ISO week (UTC, Monday start)** from ranking applications, then ELO.

Optional `grouping` on `UserSportRating` is reserved for **city / campus** filters in Postgres later.

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/leaderboards/:sport?window=all_time\|weekly` | Leaderboard entries |
| `GET` | `/v1/users/:userId/ranking/:sport` | User row + recent applications (virtual 1500 if never persisted) |
| `POST` | `/v1/challenges/:id/ranking/apply` | Consume a confirmed challenge (body `{}` OK) |

## Sample responses

**`POST /v1/challenges/ch_abc/ranking/apply`**

```json
{
  "applied": true,
  "alreadyApplied": false,
  "application": {
    "id": "rapp_…",
    "challengeId": "ch_abc",
    "sport": "tennis",
    "winnerPartyId": "p_alice",
    "loserPartyId": "p_bob",
    "winnerEloBefore": 1500,
    "winnerEloAfter": 1516,
    "loserEloBefore": 1500,
    "loserEloAfter": 1484,
    "appliedAt": "2026-04-22T12:00:00.000Z"
  },
  "winnerPartyId": "p_alice",
  "loserPartyId": "p_bob",
  "ratings": { "…": "…" }
}
```

**`GET /v1/leaderboards/tennis?window=all_time`**

```json
{
  "sport": "tennis",
  "window": "all_time",
  "entries": [
    {
      "rank": 1,
      "userId": "p_alice",
      "sport": "tennis",
      "elo": 1516,
      "wins": 1,
      "losses": 0,
      "matchesPlayed": 1,
      "winStreak": 1,
      "lossStreak": 0,
      "bestWinStreak": 1,
      "windowWins": 1,
      "window": "all_time"
    }
  ]
}
```

## Integration

- Does **not** mutate wallet, results, fraud, or challenge FSM.
- **FraudService.blocksRankingIntegration** is used before accepting an apply.

## Persistence (Postgres)

- `user_sport_ratings(user_id, sport, elo, wins, losses, …, updated_at)` PK `(user_id, sport)`.
- `ranking_applications(id, challenge_id UNIQUE, sport, winner_party_id, …, applied_at)` for idempotency and weekly rollups.

## Tests

See `tests/ranking.test.ts`.
