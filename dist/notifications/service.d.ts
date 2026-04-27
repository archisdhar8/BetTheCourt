import { type InAppNotification, type NotificationListResult, type NotificationType } from "./model.js";
import type { NotificationsRepository } from "./repository.js";
/**
 * Call from domain flows (challenge, wallet, results, …) without coupling HTTP.
 * Example: `notifications.notify({ userId, type: 'challenge_accepted', title, body, metadata: { challengeId } })`.
 */
export declare class NotificationService {
    private readonly repo;
    constructor(repo: NotificationsRepository);
    notify(input: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        metadata?: Record<string, unknown>;
        channels?: ("in_app")[];
        delivery?: Record<string, unknown>;
    }): Promise<InAppNotification>;
    listNotifications(userId: string, query?: {
        unreadOnly?: boolean;
    }): Promise<NotificationListResult>;
    markRead(userId: string, notificationId: string): Promise<InAppNotification>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
}
//# sourceMappingURL=service.d.ts.map