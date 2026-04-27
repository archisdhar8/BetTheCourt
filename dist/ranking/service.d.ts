import type { ChallengeService } from "../challenges/service.js";
import type { FraudService } from "../fraud/service.js";
import { type ApplyRankingResult, type LeaderboardEntry, type LeaderboardWindow, type UserRankingView } from "./model.js";
import { type RankingRepository } from "./repository.js";
export declare class RankingService {
    private readonly repo;
    private readonly challenges;
    private readonly fraud;
    constructor(repo: RankingRepository, challenges: ChallengeService, fraud: FraudService);
    getUserRankingView(userId: string, sport: string): Promise<UserRankingView>;
    getLeaderboard(sport: string, window: LeaderboardWindow): Promise<LeaderboardEntry[]>;
    applyRankingFromConfirmedChallenge(challengeId: string): Promise<ApplyRankingResult>;
    private assertChallengeEligible;
}
//# sourceMappingURL=service.d.ts.map