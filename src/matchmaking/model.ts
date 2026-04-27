/** Sport codes supported by the matchmaking agent (extensible). */
export type SportCode = "basketball" | "golf" | (string & {});

export type MatchFormat =
  | "1v1"
  | "2v2"
  | "3v3"
  | "4v4"
  | "5v5"
  | "team_vs_team";

/** Half-open UTC minute ranges for weekly availability (MVP). */
export type TimeWindow = {
  /** 0–6 = Sunday–Saturday (align with JS `Date#getUTCDay()`). */
  weekday: number;
  /** Minutes from midnight UTC, [start, end). */
  startMinute: number;
  endMinute: number;
};

export type MoneyRange = {
  currency: string;
  minMinor: number;
  maxMinor: number;
};

export type GeoPoint = { lat: number; lng: number };

export type UserSeekerProfile = {
  kind: "user";
  userId: string;
  sport: SportCode;
  location: GeoPoint;
  maxTravelDistanceKm: number;
  /** Single-number skill (e.g. conservative TrueSkill display or Elo). */
  skillRating: number;
  wins: number;
  losses: number;
  preferredStake: MoneyRange;
  preferredFormats: MatchFormat[];
  availabilityUtc: TimeWindow[];
  pastOpponentIds: string[];
  trustScore: number;
  verificationScore: number;
  /** ISO 8601 last activity timestamp. */
  lastActiveAt: string;
  rivalryModeEnabled?: boolean;
};

export type TeamSeekerProfile = {
  kind: "team";
  teamId: string;
  captainUserId: string;
  memberUserIds: string[];
  sport: SportCode;
  /** Team centroid or captain location for distance (MVP). */
  location: GeoPoint;
  maxTravelDistanceKm: number;
  skillRating: number;
  wins: number;
  losses: number;
  preferredStake: MoneyRange;
  preferredFormats: MatchFormat[];
  availabilityUtc: TimeWindow[];
  pastOpponentTeamIds: string[];
  trustScore: number;
  verificationScore: number;
  lastActiveAt: string;
  rivalryModeEnabled?: boolean;
};

export type SeekerProfile = UserSeekerProfile | TeamSeekerProfile;

export type UserCandidate = {
  party: "user";
  userId: string;
  displayName?: string;
  sport: SportCode;
  location: GeoPoint;
  skillRating: number;
  wins: number;
  losses: number;
  preferredStake: MoneyRange;
  preferredFormats: MatchFormat[];
  availabilityUtc: TimeWindow[];
  trustScore: number;
  verificationScore: number;
  lastActiveAt: string;
};

export type TeamCandidate = {
  party: "team";
  teamId: string;
  name?: string;
  memberCount: number;
  sport: SportCode;
  location: GeoPoint;
  skillRating: number;
  wins: number;
  losses: number;
  preferredStake: MoneyRange;
  preferredFormats: MatchFormat[];
  availabilityUtc: TimeWindow[];
  trustScore: number;
  verificationScore: number;
  lastActiveAt: string;
};

export type Candidate = UserCandidate | TeamCandidate;

export type MatchmakingWeights = {
  distance: number;
  skillFit: number;
  activity: number;
  trust: number;
  stakeOverlap: number;
  rematch: number;
};

export type MatchmakingConfig = {
  /** Max rating gap considered "acceptable" at full skillFit score. */
  skillRatingBand: number;
  /** Half-life in hours for recency scoring. */
  activityHalfLifeHours: number;
  weights: MatchmakingWeights;
  /** If true, past opponents are not heavily penalized. */
  rivalryModeEnabled: boolean;
};

export type PartialMatchmakingWeights = Partial<MatchmakingWeights>;

export type PartialMatchmakingConfig = Omit<Partial<MatchmakingConfig>, "weights"> & {
  weights?: PartialMatchmakingWeights;
};

export type PartyRef =
  | { party: "user"; userId: string }
  | { party: "team"; teamId: string };

export type RankedOpponent = {
  opponent: PartyRef;
  displayLabel?: string;
  /** 0–1 overall deterministic quality (higher is better). */
  matchQualityScore: number;
  /** 0–1 confidence the pairing is structurally fair (skill + trust + distance headroom). */
  fairnessConfidence: number;
  /** 0–1 heuristic chance the opponent accepts if challenged. */
  acceptanceLikelihood: number;
  /** Human-readable rationale (deterministic by default). */
  explanation: string;
  /** Structured features for logging / optional AI rewrites. */
  featureBreakdown: {
    distanceKm: number;
    distanceScore: number;
    skillDelta: number;
    skillFitScore: number;
    activityScore: number;
    availabilityScore: number;
    stakeOverlapScore: number;
    trustScore: number;
    rematchPenaltyApplied: boolean;
    formatOverlap: boolean;
  };
};

export type MatchmakingResult = {
  seeker: PartyRef;
  sport: SportCode;
  generatedAt: string;
  recommendations: RankedOpponent[];
};
