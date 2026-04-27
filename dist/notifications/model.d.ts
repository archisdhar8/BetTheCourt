export declare const NOTIFICATION_TYPES: readonly ["challenge_received", "challenge_accepted", "challenge_declined", "funds_locked", "venue_selected", "schedule_confirmed", "checkin_reminder", "result_submitted", "result_confirmed", "dispute_opened", "payout_completed", "fraud_hold", "ranking_updated"];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
/** In-app row; push/email/SMS are layered via `delivery` + workers later. */
export type InAppNotification = {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
    /** MVP: always in-app; extend with `push`, `email`, etc. */
    channels?: ("in_app")[];
    /** Future: worker state for external channels (not used in MVP persistence logic). */
    delivery?: Record<string, unknown>;
};
export type NotificationListResult = {
    userId: string;
    notifications: InAppNotification[];
    unreadCount: number;
};
export type NotificationErrorCode = "not_found" | "invalid_payload";
export declare class NotificationDomainError extends Error {
    readonly code: NotificationErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown;
    constructor(input: {
        code: NotificationErrorCode;
        message: string;
        httpStatus?: number;
        details?: unknown;
    });
}
//# sourceMappingURL=model.d.ts.map