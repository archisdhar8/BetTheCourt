# Notifications (in-app MVP)

Per-user **in-app** notification feed with **read / unread** state, typed lifecycle events, and optional **metadata** for deep links. Storage is separate from challenges, wallet, results, fraud, and ranking.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/notifications/model.ts` | `NOTIFICATION_TYPES`, `InAppNotification`, `NotificationDomainError` |
| `src/notifications/repository.ts` | `NotificationsRepository` + `InMemoryNotificationsRepository` |
| `src/notifications/service.ts` | `notify()` for producers, list/mark-read APIs |
| `src/notifications/contract.ts` | Zod query for list |
| `src/notifications/http/register.ts` | Fastify routes |

## Producing notifications

Domain code should depend on `NotificationService` (injected) and call **`notify({ userId, type, title, body, metadata? })`** — no HTTP, no coupling to Fastify. Push/email/SMS can subscribe to the same `notify` path later (enqueue from `delivery` hints).

## MVP types

`NOTIFICATION_TYPES` in `model.ts` includes:

`challenge_received`, `challenge_accepted`, `challenge_declined`, `funds_locked`, `venue_selected`, `schedule_confirmed`, `checkin_reminder`, `result_submitted`, `result_confirmed`, `dispute_opened`, `payout_completed`, `fraud_hold`, `ranking_updated`.

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/users/:userId/notifications?unreadOnly=true\|false` | List notifications (newest first) + `unreadCount` (always full inbox unread badge) |
| `POST` | `/v1/users/:userId/notifications/:notificationId/read` | Mark one read |
| `POST` | `/v1/users/:userId/notifications/read-all` | Mark all read; body `{}` optional |

**Auth (MVP):** routes do not enforce JWT ↔ `userId` match; wire gateway auth before production.

## Sample responses

**`GET /v1/users/u_alice/notifications`**

```json
{
  "userId": "u_alice",
  "notifications": [
    {
      "id": "notif_…",
      "userId": "u_alice",
      "type": "challenge_received",
      "title": "New challenge",
      "body": "Bob sent you a tennis match",
      "metadata": { "challengeId": "ch_123" },
      "readAt": null,
      "createdAt": "2026-04-22T10:00:00.000Z",
      "channels": ["in_app"]
    }
  ],
  "unreadCount": 1
}
```

**`GET ...?unreadOnly=true`**

Same shape; `notifications` contains only rows with `readAt === null`. `unreadCount` still reflects **all** unread in the inbox.

**`POST .../notifications/read-all`**

```json
{ "updated": 3 }
```

## Postgres direction

- Table `notifications(id, user_id, type, title, body, metadata jsonb, read_at, created_at, channels jsonb, delivery jsonb)`.
- Index `(user_id, created_at desc)`, partial index `WHERE read_at IS NULL` for unread queries.

## Tests

See `tests/notifications.test.ts`.
