import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryNotificationsRepository } from "../src/notifications/repository.js";
import { NotificationService } from "../src/notifications/service.js";
import { buildApiServer } from "../src/http/server.js";

describe("NotificationService", () => {
  let repo: InMemoryNotificationsRepository;
  let svc: NotificationService;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    svc = new NotificationService(repo);
  });

  it("creates and lists notifications newest first", async () => {
    const a = await svc.notify({
      userId: "u1",
      type: "challenge_received",
      title: "New challenge",
      body: "You have a pending challenge",
      metadata: { challengeId: "ch_1" },
    });
    const b = await svc.notify({
      userId: "u1",
      type: "funds_locked",
      title: "Funds locked",
      body: "Stake is escrowed",
    });
    const list = await svc.listNotifications("u1");
    expect(list.notifications[0]!.id).toBe(b.id);
    expect(list.notifications[1]!.id).toBe(a.id);
    expect(list.unreadCount).toBe(2);
  });

  it("filters unread only while unreadCount reflects full inbox", async () => {
    await svc.notify({ userId: "u1", type: "venue_selected", title: "Venue", body: "Set" });
    const n2 = await svc.notify({ userId: "u1", type: "schedule_confirmed", title: "Scheduled", body: "OK" });
    await svc.markRead("u1", n2.id);

    const unread = await svc.listNotifications("u1", { unreadOnly: true });
    expect(unread.notifications).toHaveLength(1);
    expect(unread.notifications[0]!.readAt).toBeNull();
    expect(unread.unreadCount).toBe(1);
  });

  it("marks one notification read", async () => {
    const n = await svc.notify({
      userId: "u1",
      type: "result_confirmed",
      title: "Confirmed",
      body: "Result locked",
    });
    const after = await svc.markRead("u1", n.id);
    expect(after.readAt).not.toBeNull();
    const list = await svc.listNotifications("u1");
    expect(list.unreadCount).toBe(0);
  });

  it("markRead rejects unknown id", async () => {
    await expect(svc.markRead("u1", "notif_missing")).rejects.toMatchObject({ code: "not_found" });
  });

  it("markAllRead updates count", async () => {
    await svc.notify({ userId: "u1", type: "payout_completed", title: "Paid", body: "Done" });
    await svc.notify({ userId: "u1", type: "ranking_updated", title: "ELO", body: "Updated" });
    const out = await svc.markAllRead("u1");
    expect(out.updated).toBe(2);
    expect((await svc.listNotifications("u1")).unreadCount).toBe(0);
  });

  it("isolates users", async () => {
    await svc.notify({ userId: "a", type: "dispute_opened", title: "D", body: "x" });
    const list = await svc.listNotifications("b");
    expect(list.notifications).toHaveLength(0);
  });
});

describe("Notifications HTTP", () => {
  it("GET list empty, read-all idempotent, invalid query 400, mark read 404", async () => {
    const app = buildApiServer();
    await app.ready();

    const get = await app.inject({ method: "GET", url: "/v1/users/http_u/notifications" });
    expect(get.statusCode).toBe(200);
    const empty = JSON.parse(get.body) as { unreadCount: number; notifications: unknown[] };
    expect(empty.unreadCount).toBe(0);
    expect(empty.notifications).toEqual([]);

    const readAll = await app.inject({ method: "POST", url: "/v1/users/http_u/notifications/read-all" });
    expect(readAll.statusCode).toBe(200);
    expect((JSON.parse(readAll.body) as { updated: number }).updated).toBe(0);

    const badQuery = await app.inject({ method: "GET", url: "/v1/users/http_u/notifications?unreadOnly=maybe" });
    expect(badQuery.statusCode).toBe(400);

    const miss = await app.inject({
      method: "POST",
      url: "/v1/users/http_u/notifications/notif_nope/read",
    });
    expect(miss.statusCode).toBe(404);

    await app.close();
  });
});
