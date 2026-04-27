export const NOTIFICATION_TYPES = [
    "challenge_received",
    "challenge_accepted",
    "challenge_declined",
    "funds_locked",
    "venue_selected",
    "schedule_confirmed",
    "checkin_reminder",
    "result_submitted",
    "result_confirmed",
    "dispute_opened",
    "payout_completed",
    "fraud_hold",
    "ranking_updated",
];
export class NotificationDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "NotificationDomainError";
    }
}
//# sourceMappingURL=model.js.map