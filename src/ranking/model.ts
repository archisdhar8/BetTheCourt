export const DEFAULT_ELO = 1500;
export const K_FACTOR = 32;

export type LeaderboardWindow = "all_time" | "weekly";

export type UserSportRating = {
  userId: string;
  sport: string;
  elo: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  /** Current consecutive wins (0 if last match was not a win). */
  winStreak: number;
  /** Current consecutive losses. */
  lossStreak: number;
  bestWinStreak: number;
  updatedAt: string;
  /** Placeholder for campus / city scoped leaderboards (Postgres/geo later). */
  grouping?: { campusId?: string; city?: string };
};

export type RankingApplicationRecord = {
  id: string;
  challengeId: string;
  sport: string;
  winnerPartyId: string;
  loserPartyId: string;
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
  appliedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  sport: string;
  elo: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winStreak: number;
  lossStreak: number;
  bestWinStreak: number;
  /** Wins counted in the requested window (equals `wins` for `all_time`). */
  windowWins: number;
  window: LeaderboardWindow;
};

export type UserRankingView = {
  userId: string;
  sport: string;
  rating: UserSportRating;
  recentApplications: RankingApplicationRecord[];
};

export type ApplyRankingResult = {
  applied: boolean;
  alreadyApplied: boolean;
  application?: RankingApplicationRecord;
  winnerPartyId: string;
  loserPartyId: string;
  ratings: { winner: UserSportRating; loser: UserSportRating };
};

export type RankingErrorCode =
  | "not_found"
  | "ranking_not_eligible"
  | "fraud_blocked_ranking"
  | "winner_undetermined"
  | "team_ranking_not_supported";

export class RankingDomainError extends Error {
  readonly code: RankingErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(input: { code: RankingErrorCode; message: string; httpStatus?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
    this.name = "RankingDomainError";
  }
}

/** Standard ELO expected score for player A vs B. */
export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

/** Update ELO after a decisive match (A wins if `scoreA` is 1). */
export function computeEloUpdate(ra: number, rb: number, scoreA: 0 | 1): { newRa: number; newRb: number } {
  const ea = expectedScore(ra, rb);
  const eb = 1 - ea;
  const sa = scoreA;
  const sb = (1 - scoreA) as 0 | 1;
  const newRa = ra + K_FACTOR * (sa - ea);
  const newRb = rb + K_FACTOR * (sb - eb);
  return {
    newRa: Math.round(newRa * 100) / 100,
    newRb: Math.round(newRb * 100) / 100,
  };
}

/** Monday 00:00:00.000Z for the ISO week containing `d` (week starts Monday). */
export function startOfUtcIsoWeek(d: Date): Date {
  const day = d.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta, 0, 0, 0, 0));
}
