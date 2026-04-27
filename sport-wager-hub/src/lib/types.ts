// Domain DTOs — typed contracts mirroring the Fastify API surface.
// Conservative: server is source of truth; UI never enforces business rules.

export type Sport = "basketball" | "tennis" | "padel" | "pool" | "darts" | "chess" | "ping_pong";
export type Mode = "singles" | "doubles" | "best_of_3" | "best_of_5" | "1v1" | "team";
export type Currency = "USD" | "EUR" | "GBP";

export type ChallengeState =
  | "draft"
  | "pending"
  | "accepted"
  | "funded"
  | "scheduled"
  | "completed"
  | "confirmed"
  | "disputed"
  | "refunded"
  | "cancelled"
  | "paid_out";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  elo: number;
  homeVenueId?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  currency: Currency;
  available: number;
  locked: number;
  createdAt: string;
}

export interface WalletLockEntry {
  challengeId: string;
  amount: number;
  state: "locked" | "released" | "paid_out";
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  qualityScore: number;
  sports: Sport[];
}

export interface VenueRanking {
  venue: Venue;
  suitabilityScore: number;
  centrality: number;
  travelKmByParty: Record<string, number>;
  homeCourtFor?: string;
  rationale: string[];
}

export interface MatchCandidate {
  user: User;
  matchQuality: number;
  fairnessConfidence: number;
  acceptanceLikelihood: number;
  explanation: string[];
  distanceKm: number;
}

export interface FundingState {
  creatorLocked: boolean;
  opponentLocked: boolean;
  amount: number;
  currency: Currency;
}

export interface ScheduleSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  venueId?: string;
  confirmedBy: string[];
}

export interface ScheduleProposal {
  id: string;
  proposedBy: string;
  slots: ScheduleSlot[];
  expiresAt: string;
  state: "pending" | "confirmed" | "expired" | "superseded" | "cancelled";
  confirmedSlotId?: string;
}

export interface CheckIn {
  userId: string;
  at: string;
  lat: number;
  lng: number;
  valid: boolean;
  reason?: "outside_radius" | "outside_time_window" | "ok";
}

export interface CheckInStatus {
  bothCheckedInValid: boolean;
  policyRadiusM: number;
  windowMinutes: number;
  records: CheckIn[];
}

export interface ResultRound {
  id: string;
  fingerprint: string;
  submittedBy: string;
  submittedAt: string;
  payload: Record<string, unknown>;
  decisions: { userId: string; decision: "confirm" | "dispute"; ackFingerprint?: string; reason?: string }[];
  state: "pending" | "confirmed" | "disputed";
}

export interface FraudEvaluation {
  id: string;
  challengeId: string;
  version: number;
  score: number;
  recommendedAction: "allow" | "review" | "block";
  payoutEligible: boolean;
  signals: { code: string; weight: number; description: string }[];
  evaluatedAt: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  type: string;
  by?: string;
  message: string;
}

export interface Challenge {
  id: string;
  sport: Sport;
  mode: Mode;
  stake: number;
  currency: Currency;
  creatorId: string;
  opponentId: string;
  venueId?: string;
  state: ChallengeState;
  createdAt: string;
  updatedAt: string;
  funding: FundingState;
  scheduleProposalId?: string;
  activeRoundId?: string;
  timeline: TimelineEvent[];
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  windowWins: number;
}

export type NotificationType =
  | "challenge_received"
  | "challenge_accepted"
  | "challenge_declined"
  | "funds_locked"
  | "venue_selected"
  | "schedule_proposed"
  | "schedule_confirmed"
  | "checkin_reminder"
  | "checkin_valid"
  | "result_submitted"
  | "result_confirmed"
  | "dispute_opened"
  | "result_disputed"
  | "payout_released"
  | "payout_completed"
  | "fraud_flagged"
  | "fraud_hold"
  | "ranking_updated";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata: { challengeId?: string; [k: string]: unknown };
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
