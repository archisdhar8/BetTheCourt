# BetTheCourt

## Matchmaking Agent (MVP)

- Code: `src/matchmaking/`
- Docs: `docs/matchmaking-agent.md`
- Tests: `npm test`

## Venue Discovery Agent (MVP)

- Code: `src/venue/`
- Docs: `docs/venue-agent.md`
- Combined API: `npm run dev:api` → `POST /v1/matchmaking/recommend`, `POST /v1/venue-discovery/rank`
- Venue-only: `npm run dev:api:venue` (default port `3001`)

## Challenges (MVP)

- Code: `src/challenges/`
- Docs: `docs/challenge-lifecycle.md`
- Combined API: `POST /v1/challenges`, `GET /v1/challenges/:id`, `POST /v1/challenges/:id/escrow/lock` (wallet), `POST /v1/challenges/:id/schedule/propose` (scheduling), … (see `docs/challenge-lifecycle.md`, `docs/wallet-agent.md`, `docs/scheduling-agent.md`)

## Scheduling agent (MVP)

- Code: `src/scheduling/`
- Docs: `docs/scheduling-agent.md`

## Result verification (MVP)

- Code: `src/results/`
- Docs: `docs/result-verification-agent.md`

## Check-in / presence (MVP)

- Code: `src/checkin/`
- Docs: `docs/checkin-module.md`

## Fraud detection (MVP)

- Code: `src/fraud/`
- Docs: `docs/fraud-detection.md`

## Ranking / leaderboard (MVP)

- Code: `src/ranking/`
- Docs: `docs/ranking-leaderboard.md`

## Notifications (MVP)

- Code: `src/notifications/`
- Docs: `docs/notifications-module.md`