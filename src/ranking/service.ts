import type { Challenge } from "../challenges/model.js";
import { canRecordRanking } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import type { FraudService } from "../fraud/service.js";
import { extractWinnerPartyId } from "../fraud/model.js";
import {
  computeEloUpdate,
  DEFAULT_ELO,
  RankingDomainError,
  startOfUtcIsoWeek,
  type ApplyRankingResult,
  type LeaderboardEntry,
  type LeaderboardWindow,
  type RankingApplicationRecord,
  type UserRankingView,
  type UserSportRating,
} from "./model.js";
import { newRankingApplicationId, type RankingRepository } from "./repository.js";

async function loadOrInitRating(
  repo: RankingRepository,
  userId: string,
  sport: string,
  now: string,
): Promise<UserSportRating> {
  const existing = await repo.getUserRating(userId, sport);
  if (existing) return { ...existing };
  return {
    userId,
    sport,
    elo: DEFAULT_ELO,
    performanceScore: 1000,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    winStreak: 0,
    lossStreak: 0,
    bestWinStreak: 0,
    updatedAt: now,
  };
}

function applyWinLossToRating(
  row: UserSportRating,
  outcome: "win" | "loss",
  newElo: number,
  now: string,
): UserSportRating {
  const wins = outcome === "win" ? row.wins + 1 : row.wins;
  const losses = outcome === "loss" ? row.losses + 1 : row.losses;
  const matchesPlayed = row.matchesPlayed + 1;
  let winStreak = row.winStreak;
  let lossStreak = row.lossStreak;
  let bestWinStreak = row.bestWinStreak;
  if (outcome === "win") {
    winStreak = row.winStreak + 1;
    lossStreak = 0;
    bestWinStreak = Math.max(bestWinStreak, winStreak);
  } else {
    lossStreak = row.lossStreak + 1;
    winStreak = 0;
  }
  return {
    ...row,
    elo: newElo,
    performanceScore:
      outcome === "win"
        ? row.performanceScore + 18 + Math.min(12, row.winStreak * 2)
        : Math.max(600, row.performanceScore - 12),
    wins,
    losses,
    matchesPlayed,
    winStreak,
    lossStreak,
    bestWinStreak,
    updatedAt: now,
  };
}

export class RankingService {
  constructor(
    private readonly repo: RankingRepository,
    private readonly challenges: ChallengeService,
    private readonly fraud: FraudService,
  ) {}

  async getUserRankingView(userId: string, sport: string): Promise<UserRankingView> {
    const now = new Date().toISOString();
    const rating = await loadOrInitRating(this.repo, userId, sport, now);
    const all = await this.repo.listApplicationsForSport(sport);
    const recent = all
      .filter((a) => a.winnerPartyId === userId || a.loserPartyId === userId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .slice(0, 20);
    return { userId, sport, rating, recentApplications: recent };
  }

  async getLeaderboard(sport: string, window: LeaderboardWindow): Promise<LeaderboardEntry[]> {
    const ratingType: "elo" | "performance" = sport === "chess" ? "elo" : "performance";
    const rows = await this.repo.listRatingsForSport(sport);
    const apps = await this.repo.listApplicationsForSport(sport);

    const weekStart = startOfUtcIsoWeek(new Date());
    const weekStartMs = weekStart.getTime();

    const windowWins = new Map<string, number>();
    if (window === "weekly") {
      for (const a of apps) {
        const t = new Date(a.appliedAt).getTime();
        if (t < weekStartMs) continue;
        windowWins.set(a.winnerPartyId, (windowWins.get(a.winnerPartyId) ?? 0) + 1);
      }
    }

    const entries: LeaderboardEntry[] = rows.map((r) => {
      const ww = window === "weekly" ? (windowWins.get(r.userId) ?? 0) : r.wins;
      return {
        rank: 0,
        userId: r.userId,
        sport: r.sport,
        elo: r.elo,
        performanceScore: r.performanceScore,
        ratingType,
        displayScore: ratingType === "elo" ? r.elo : r.performanceScore,
        wins: r.wins,
        losses: r.losses,
        matchesPlayed: r.matchesPlayed,
        winStreak: r.winStreak,
        lossStreak: r.lossStreak,
        bestWinStreak: r.bestWinStreak,
        windowWins: ww,
        window,
      };
    });

    entries.sort((a, b) => {
      if (window === "weekly") {
        if (b.windowWins !== a.windowWins) return b.windowWins - a.windowWins;
      }
      if (ratingType === "elo" && b.elo !== a.elo) return b.elo - a.elo;
      if (ratingType === "performance" && b.performanceScore !== a.performanceScore) {
        return b.performanceScore - a.performanceScore;
      }
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.userId.localeCompare(b.userId);
    });

    let rank = 1;
    for (const e of entries) {
      e.rank = rank++;
    }
    return entries;
  }

  async applyRankingFromConfirmedChallenge(challengeId: string): Promise<ApplyRankingResult> {
    const ch = await this.challenges.getChallenge(challengeId);
    this.assertChallengeEligible(ch);

    if (await this.repo.hasRankingApplication(challengeId)) {
      const apps = await this.repo.listApplicationsForSport(ch.sport);
      const prev = apps.find((a) => a.challengeId === challengeId);
      const winnerPartyId = extractWinnerPartyId(
        ch.result as Record<string, unknown> | undefined,
        ch.creatorPartyId,
        ch.opponentPartyId,
      );
      if (!winnerPartyId) {
        throw new RankingDomainError({
          code: "winner_undetermined",
          message: "Challenge result does not declare a winner party",
          httpStatus: 409,
        });
      }
      const loserPartyId = winnerPartyId === ch.creatorPartyId ? ch.opponentPartyId : ch.creatorPartyId;
      const now = new Date().toISOString();
      const winner = (await this.repo.getUserRating(winnerPartyId, ch.sport)) ?? (await loadOrInitRating(this.repo, winnerPartyId, ch.sport, now));
      const loser = (await this.repo.getUserRating(loserPartyId, ch.sport)) ?? (await loadOrInitRating(this.repo, loserPartyId, ch.sport, now));
      return {
        applied: false,
        alreadyApplied: true,
        application: prev,
        winnerPartyId,
        loserPartyId,
        ratings: { winner, loser },
      };
    }

    if (await this.fraud.blocksRankingIntegration(challengeId)) {
      throw new RankingDomainError({
        code: "fraud_blocked_ranking",
        message: "Ranking cannot consume this challenge while fraud clearance is negative",
        httpStatus: 409,
      });
    }

    const winnerPartyId = extractWinnerPartyId(
      ch.result as Record<string, unknown> | undefined,
      ch.creatorPartyId,
      ch.opponentPartyId,
    );
    if (!winnerPartyId) {
      throw new RankingDomainError({
        code: "winner_undetermined",
        message: "Challenge result does not declare a winner party (expected winnerPartyId or winner)",
        httpStatus: 409,
      });
    }
    const loserPartyId = winnerPartyId === ch.creatorPartyId ? ch.opponentPartyId : ch.creatorPartyId;

    const now = new Date().toISOString();
    let winner = await loadOrInitRating(this.repo, winnerPartyId, ch.sport, now);
    let loser = await loadOrInitRating(this.repo, loserPartyId, ch.sport, now);

    const wb = winner.elo;
    const lb = loser.elo;
    const { newRa: newWinnerElo, newRb: newLoserElo } = computeEloUpdate(wb, lb, 1);

    const winnerEloBefore = wb;
    const loserEloBefore = lb;
    const useElo = ch.sport === "chess";
    winner = applyWinLossToRating(winner, "win", useElo ? newWinnerElo : winner.elo, now);
    loser = applyWinLossToRating(loser, "loss", useElo ? newLoserElo : loser.elo, now);

    await this.repo.saveUserRating(winner);
    await this.repo.saveUserRating(loser);

    const application: RankingApplicationRecord = {
      id: newRankingApplicationId(),
      challengeId,
      sport: ch.sport,
      winnerPartyId,
      loserPartyId,
      winnerEloBefore,
      winnerEloAfter: winner.elo,
      loserEloBefore,
      loserEloAfter: loser.elo,
      appliedAt: now,
    };
    await this.repo.appendApplication(application);

    return {
      applied: true,
      alreadyApplied: false,
      application,
      winnerPartyId,
      loserPartyId,
      ratings: { winner, loser },
    };
  }

  private assertChallengeEligible(ch: Challenge): void {
    if (ch.mode === "team") {
      throw new RankingDomainError({
        code: "team_ranking_not_supported",
        message: "Team-based ranking is reserved for a future extension",
        httpStatus: 501,
      });
    }
    if (!canRecordRanking(ch.state)) {
      throw new RankingDomainError({
        code: "ranking_not_eligible",
        message: `Ranking only applies to confirmed or paid_out challenges (got ${ch.state})`,
        httpStatus: 409,
      });
    }
  }
}
