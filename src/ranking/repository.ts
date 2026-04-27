import { randomUUID } from "node:crypto";
import type { RankingApplicationRecord, UserSportRating } from "./model.js";

/**
 * Persistence port. Postgres: `user_sport_ratings`, `ranking_applications` (unique on challenge_id).
 */
export interface RankingRepository {
  getUserRating(userId: string, sport: string): Promise<UserSportRating | null>;
  saveUserRating(row: UserSportRating): Promise<void>;
  listRatingsForSport(sport: string): Promise<UserSportRating[]>;
  hasRankingApplication(challengeId: string): Promise<boolean>;
  appendApplication(rec: RankingApplicationRecord): Promise<void>;
  listApplicationsForSport(sport: string): Promise<RankingApplicationRecord[]>;
}

export class InMemoryRankingRepository implements RankingRepository {
  private readonly ratings = new Map<string, UserSportRating>();
  private readonly applications: RankingApplicationRecord[] = [];
  private readonly appliedChallengeIds = new Set<string>();

  private key(userId: string, sport: string): string {
    return `${userId}::${sport}`;
  }

  async getUserRating(userId: string, sport: string): Promise<UserSportRating | null> {
    return this.ratings.get(this.key(userId, sport)) ?? null;
  }

  async saveUserRating(row: UserSportRating): Promise<void> {
    this.ratings.set(this.key(row.userId, row.sport), { ...row });
  }

  async listRatingsForSport(sport: string): Promise<UserSportRating[]> {
    return [...this.ratings.values()].filter((r) => r.sport === sport);
  }

  async hasRankingApplication(challengeId: string): Promise<boolean> {
    return this.appliedChallengeIds.has(challengeId);
  }

  async appendApplication(rec: RankingApplicationRecord): Promise<void> {
    this.applications.push(rec);
    this.appliedChallengeIds.add(rec.challengeId);
  }

  async listApplicationsForSport(sport: string): Promise<RankingApplicationRecord[]> {
    return this.applications.filter((a) => a.sport === sport);
  }

  clear(): void {
    this.ratings.clear();
    this.applications.length = 0;
    this.appliedChallengeIds.clear();
  }
}

export function newRankingApplicationId(): string {
  return `rapp_${randomUUID()}`;
}
