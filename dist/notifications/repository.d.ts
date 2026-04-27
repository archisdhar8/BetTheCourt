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
export declare class InMemoryNotificationsRepository implements NotificationsRepository {
    private readonly rows;
    insert(notification: InAppNotification): Promise<void>;
    listForUser(userId: string): Promise<InAppNotification[]>;
    findForUser(userId: string, notificationId: string): Promise<InAppNotification | null>;
    updateReadAt(userId: string, notificationId: string, readAt: string | null): Promise<void>;
    markAllReadForUser(userId: string, readAt: string): Promise<number>;
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map