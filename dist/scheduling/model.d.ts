/** ISO-8601 instants for slot boundaries. */
export type TimeSlot = {
    id: string;
    startAt: string;
    endAt: string;
    note?: string;
    /** End time including optional travel buffer (deterministic extension of `endAt`). */
    effectiveEndAt: string;
    /** Optional diagnostics for future reminders / no-show rules. */
    meta?: {
        travelBufferMinutes?: number;
        estimatedMaxTravelKm?: number;
    };
};
export type ProposalStatus = "pending" | "superseded" | "confirmed" | "expired" | "cancelled";
export type ScheduleProposalRecord = {
    id: string;
    challengeId: string;
    version: number;
    proposedByPartyId: string;
    slots: TimeSlot[];
    status: ProposalStatus;
    expiresAt: string;
    createdAt: string;
    /** First party to confirm sets the required slot for the other party. */
    confirmations: Partial<Record<string, string>>;
};
export type ScheduleSession = {
    challengeId: string;
    proposals: ScheduleProposalRecord[];
    activePendingProposalId?: string;
    /** Populated after both parties confirm the same slot and the challenge aggregate is updated. */
    confirmedSlot?: TimeSlot;
    /** Extension point for reminders, no-show tracking, audit. */
    extensions?: Record<string, unknown>;
};
export type ScheduleView = {
    challengeId: string;
    challengeState: string;
    venueId?: string;
    /** True when challenge is funded (required for final confirmation). */
    fundingReady: boolean;
    proposals: ScheduleProposalRecord[];
    activePendingProposal?: ScheduleProposalRecord;
    confirmedSlot?: TimeSlot;
};
export type SchedulingErrorCode = "not_found" | "invalid_payload" | "forbidden_actor" | "challenge_not_schedulable" | "venue_required" | "funding_required" | "proposal_expired" | "proposal_not_pending" | "slot_unknown" | "slot_mismatch" | "already_scheduled";
export declare class SchedulingDomainError extends Error {
    readonly code: SchedulingErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown;
    constructor(input: {
        code: SchedulingErrorCode;
        message: string;
        httpStatus?: number;
        details?: unknown;
    });
}
//# sourceMappingURL=model.d.ts.map