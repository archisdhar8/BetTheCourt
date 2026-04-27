/** Opaque sport-specific result body; validated via `assertSportResultPayload` (extensible). */
export type ResultPayload = Record<string, unknown>;
export type VerificationDecisionType = "confirm" | "dispute";
export type PartyDecision = {
    type: "confirm";
    at: string;
    note?: string;
} | {
    type: "dispute";
    at: string;
    reason: string;
    counterPayload?: ResultPayload;
};
export type ResultVerificationRound = {
    id: string;
    challengeId: string;
    version: number;
    submittedByPartyId: string;
    payload: ResultPayload;
    /** Deterministic digest for equality checks (`canonicalResultFingerprint`). */
    fingerprint: string;
    submittedAt: string;
    status: "pending" | "confirmed" | "disputed" | "superseded";
    decisions: Partial<Record<string, PartyDecision>>;
};
export type ResultVerificationBundle = {
    challengeId: string;
    rounds: ResultVerificationRound[];
    /** Extension point: evidence URIs, deadlines, audit. */
    extensions?: Record<string, unknown>;
};
export type ResultsView = {
    challengeId: string;
    challengeState: string;
    activeRound?: ResultVerificationRound;
    rounds: ResultVerificationRound[];
};
export type ResultsErrorCode = "not_found" | "invalid_payload" | "forbidden_actor" | "challenge_not_resultable" | "self_confirm_forbidden" | "already_resolved" | "no_pending_round" | "already_decided" | "payload_mismatch";
export declare class ResultsDomainError extends Error {
    readonly code: ResultsErrorCode;
    readonly httpStatus: number;
    readonly details?: unknown;
    constructor(input: {
        code: ResultsErrorCode;
        message: string;
        httpStatus?: number;
        details?: unknown;
    });
}
/** Stable JSON for deterministic equality (sorted keys, recursively). */
export declare function canonicalResultFingerprint(payload: ResultPayload): string;
/** Stub for sport-specific rules (scores shape, required keys, etc.). */
export declare function assertSportResultPayload(sport: string, payload: ResultPayload): void;
//# sourceMappingURL=model.d.ts.map