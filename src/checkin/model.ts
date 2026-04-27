import { haversineKm } from "../matchmaking/scoring.js";

export type CheckInInvalidReason = "outside_time_window" | "outside_radius";

export type PartyCheckInRecord = {
  partyId: string;
  submittedAt: string;
  coordinates: { lat: number; lng: number };
  /** Great-circle distance to venue reference point (meters). */
  distanceToVenueMeters: number;
  valid: boolean;
  invalidReasons: CheckInInvalidReason[];
};

/** Per-challenge check-in aggregate; persisted separately from `Challenge`. */
export type CheckInBundle = {
  challengeId: string;
  /** Latest attempt per party (valid or invalid); superseded when re-check-in allowed. */
  byPartyId: Record<string, PartyCheckInRecord>;
  /** Extension point: device attestation, IP hints, evidence URIs. */
  extensions?: Record<string, unknown>;
};

export type CheckInPolicy = {
  /** Minutes before `scheduledStartAt` when check-in opens. */
  windowBeforeStartMinutes: number;
  /** Minutes after `scheduledStartAt` when check-in closes. */
  windowAfterStartMinutes: number;
  /** Maximum allowed distance from venue coordinates (meters). */
  maxDistanceMeters: number;
  /** When true, a party with a **valid** check-in may submit again (latest wins). */
  allowRecheckin: boolean;
};

export const DEFAULT_CHECKIN_POLICY: CheckInPolicy = {
  windowBeforeStartMinutes: 120,
  windowAfterStartMinutes: 240,
  maxDistanceMeters: 500,
  allowRecheckin: false,
};

export type CheckinErrorCode =
  | "not_found"
  | "forbidden_actor"
  | "challenge_not_scheduled"
  | "missing_venue"
  | "missing_schedule"
  | "venue_location_unknown"
  | "duplicate_checkin"
  | "invalid_payload";

export class CheckinDomainError extends Error {
  readonly code: CheckinErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(input: { code: CheckinErrorCode; message: string; httpStatus?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
    this.name = "CheckinDomainError";
  }
}

/** Placeholder for future no-show / fraud / result-confidence models. */
export type NoShowRiskPlaceholder = {
  /** Reserved for ML / rules engine (null in MVP). */
  modelScore: null | number;
  /** Human-readable hints for ops dashboards. */
  hints: string[];
};

export type CheckInStatusView = {
  challengeId: string;
  challengeState: string;
  venueId?: string;
  scheduledStartAt?: string;
  policy: CheckInPolicy;
  creatorPartyId: string;
  opponentPartyId: string;
  creator: PartyCheckInRecord | null;
  opponent: PartyCheckInRecord | null;
  bothCheckedInValid: boolean;
  noShowRisk: NoShowRiskPlaceholder;
};

export function mergeCheckinPolicy(overrides?: Partial<CheckInPolicy>): CheckInPolicy {
  return { ...DEFAULT_CHECKIN_POLICY, ...overrides };
}

export function distanceToVenueMeters(
  user: { lat: number; lng: number },
  venue: { lat: number; lng: number },
): number {
  return haversineKm(user, venue) * 1000;
}

export function isWithinTimeWindow(input: {
  nowMs: number;
  startAtIso: string;
  policy: CheckInPolicy;
}): boolean {
  const start = new Date(input.startAtIso).getTime();
  if (Number.isNaN(start)) return false;
  const open = start - input.policy.windowBeforeStartMinutes * 60_000;
  const close = start + input.policy.windowAfterStartMinutes * 60_000;
  return input.nowMs >= open && input.nowMs <= close;
}

export function buildNoShowRiskPlaceholder(
  ch: { state: string; creatorPartyId: string; opponentPartyId: string },
  bundle: CheckInBundle | null,
  nowMs: number,
  scheduledStartAt?: string,
): NoShowRiskPlaceholder {
  const hints: string[] = [];
  const startMs = scheduledStartAt ? new Date(scheduledStartAt).getTime() : NaN;
  const pastStart = !Number.isNaN(startMs) && nowMs > startMs;

  const creatorOk = bundle?.byPartyId[ch.creatorPartyId]?.valid === true;
  const opponentOk = bundle?.byPartyId[ch.opponentPartyId]?.valid === true;

  if (ch.state === "scheduled" && pastStart) {
    if (!creatorOk) hints.push("no_valid_checkin_creator_after_start");
    if (!opponentOk) hints.push("no_valid_checkin_opponent_after_start");
  }

  return { modelScore: null, hints };
}
