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
export declare class InMemoryRankingRepository implements RankingRepository {
    private readonly ratings;
    private readonly applications;
    private readonly appliedChallengeIds;
    private key;
    getUserRating(userId: string, sport: string): Promise<UserSportRating | null>;
    saveUserRating(row: UserSportRating): Promise<void>;
    listRatingsForSport(sport: string): Promise<UserSportRating[]>;
    hasRankingApplication(challengeId: string): Promise<boolean>;
    appendApplication(rec: RankingApplicationRecord): Promise<void>;
    listApplicationsForSport(sport: string): Promise<RankingApplicationRecord[]>;
    clear(): void;
}
export declare function newRankingApplicationId(): string;
//# sourceMappingURL=repository.d.ts.map