import type { InAppNotification } from "./model.js";

/**
 * Persistence port. Postgres: `notifications` table with `(user_id, id)` PK, indexes on `(user_id, read_at)`, `(user_id, created_at desc)`.
 */
export interface NotificationsRepository {
  insert(notification: InAppNotification): Promise<void>;
  listForUser(userId: string): Promise<InAppNotification[]>;
  findForUser(userId: string, notificationId: string): Promise<InAppNotification | null>;
  updateReadAt(userId: string, notificationId: string, readAt: string | null): Promise<void>;
  markAllReadForUser(userId: string, readAt: string): Promise<number>;
}

export class InMemoryNotificationsRepository implements NotificationsRepository {
  private readonly rows: InAppNotification[] = [];

  async insert(notification: InAppNotification): Promise<void> {
    this.rows.push({ ...notification });
  }

  async listForUser(userId: string): Promise<InAppNotification[]> {
    const indexed = this.rows
      .map((n, idx) => ({ n, idx }))
      .filter((x) => x.n.userId === userId);
    return indexed
      .sort((a, b) => {
        const t = b.n.createdAt.localeCompare(a.n.createdAt);
        if (t !== 0) return t;
        return b.idx - a.idx;
      })
      .map((x) => x.n);
  }

  async findForUser(userId: string, notificationId: string): Promise<InAppNotification | null> {
    return this.rows.find((n) => n.userId === userId && n.id === notificationId) ?? null;
  }

  async updateReadAt(userId: string, notificationId: string, readAt: string | null): Promise<void> {
    const n = this.rows.find((r) => r.userId === userId && r.id === notificationId);
    if (!n) return;
    n.readAt = readAt;
  }

  async markAllReadForUser(userId: string, readAt: string): Promise<number> {
    let n = 0;
    for (const row of this.rows) {
      if (row.userId === userId && row.readAt === null) {
        row.readAt = readAt;
        n++;
      }
    }
    return n;
  }

  clear(): void {
    this.rows.length = 0;
  }
}
