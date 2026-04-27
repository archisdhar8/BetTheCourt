/** Opaque sport-specific result body; validated via `assertSportResultPayload` (extensible). */
export type ResultPayload = Record<string, unknown>;

export type VerificationDecisionType = "confirm" | "dispute";

export type PartyDecision =
  | { type: "confirm"; at: string; note?: string }
  | { type: "dispute"; at: string; reason: string; counterPayload?: ResultPayload };

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

export type ResultsErrorCode =
  | "not_found"
  | "invalid_payload"
  | "forbidden_actor"
  | "challenge_not_resultable"
  | "self_confirm_forbidden"
  | "already_resolved"
  | "no_pending_round"
  | "already_decided"
  | "payload_mismatch";

export class ResultsDomainError extends Error {
  readonly code: ResultsErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(input: { code: ResultsErrorCode; message: string; httpStatus?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
    this.name = "ResultsDomainError";
  }
}

/** Stable JSON for deterministic equality (sorted keys, recursively). */
export function canonicalResultFingerprint(payload: ResultPayload): string {
  return stableStringify(payload);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Stub for sport-specific rules (scores shape, required keys, etc.). */
export function assertSportResultPayload(sport: string, payload: ResultPayload): void {
  if (!sport || sport.length > 64) {
    throw new ResultsDomainError({ code: "invalid_payload", message: "Invalid sport", httpStatus: 400 });
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ResultsDomainError({ code: "invalid_payload", message: "Result must be a JSON object", httpStatus: 400 });
  }
}
