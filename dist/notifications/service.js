import { randomUUID } from "node:crypto";
import { NotificationDomainError, } from "./model.js";
/**
 * Call from domain flows (challenge, wallet, results, …) without coupling HTTP.
 * Example: `notifications.notify({ userId, type: 'challenge_accepted', title, body, metadata: { challengeId } })`.
 */
export class NotificationService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async notify(input) {
        const now = new Date().toISOString();
        const n = {
            id: `notif_${randomUUID()}`,
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            metadata: input.metadata,
            readAt: null,
            createdAt: now,
            channels: input.channels ?? ["in_app"],
            delivery: input.delivery,
        };
        await this.repo.insert(n);
        return n;
    }
    async listNotifications(userId, query) {
        const all = await this.repo.listForUser(userId);
        const unreadCount = all.filter((n) => n.readAt === null).length;
        const notifications = query?.unreadOnly === true ? all.filter((n) => n.readAt === null) : all;
        return { userId, notifications, unreadCount };
    }
    async markRead(userId, notificationId) {
        const existing = await this.repo.findForUser(userId, notificationId);
        if (!existing) {
            throw new NotificationDomainError({
                code: "not_found",
                message: `Notification ${notificationId} not found for user`,
                httpStatus: 404,
            });
        }
        const readAt = new Date().toISOString();
        await this.repo.updateReadAt(userId, notificationId, readAt);
        return { ...existing, readAt };
    }
    async markAllRead(userId) {
        const readAt = new Date().toISOString();
        const updated = await this.repo.markAllReadForUser(userId, readAt);
        return { updated };
    }
}
//# sourceMappingURL=service.js.map