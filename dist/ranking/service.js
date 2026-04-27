import { canRecordRanking } from "../challenges/model.js";
import { extractWinnerPartyId } from "../fraud/model.js";
import { computeEloUpdate, DEFAULT_ELO, RankingDomainError, startOfUtcIsoWeek, } from "./model.js";
import { newRankingApplicationId } from "./repository.js";
async function loadOrInitRating(repo, userId, sport, now) {
    const existing = await repo.getUserRating(userId, sport);
    if (existing)
        return { ...existing };
    return {
        userId,
        sport,
        elo: DEFAULT_ELO,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        winStreak: 0,
        lossStreak: 0,
        bestWinStreak: 0,
        updatedAt: now,
    };
}
function applyWinLossToRating(row, outcome, newElo, now) {
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
    }
    else {
        lossStreak = row.lossStreak + 1;
        winStreak = 0;
    }
    return {
        ...row,
        elo: newElo,
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
    repo;
    challenges;
    fraud;
    constructor(repo, challenges, fraud) {
        this.repo = repo;
        this.challenges = challenges;
        this.fraud = fraud;
    }
    async getUserRankingView(userId, sport) {
        const now = new Date().toISOString();
        const rating = await loadOrInitRating(this.repo, userId, sport, now);
        const all = await this.repo.listApplicationsForSport(sport);
        const recent = all
            .filter((a) => a.winnerPartyId === userId || a.loserPartyId === userId)
            .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
            .slice(0, 20);
        return { userId, sport, rating, recentApplications: recent };
    }
    async getLeaderboard(sport, window) {
        const rows = await this.repo.listRatingsForSport(sport);
        const apps = await this.repo.listApplicationsForSport(sport);
        const weekStart = startOfUtcIsoWeek(new Date());
        const weekStartMs = weekStart.getTime();
        const windowWins = new Map();
        if (window === "weekly") {
            for (const a of apps) {
                const t = new Date(a.appliedAt).getTime();
                if (t < weekStartMs)
                    continue;
                windowWins.set(a.winnerPartyId, (windowWins.get(a.winnerPartyId) ?? 0) + 1);
            }
        }
        const entries = rows.map((r) => {
            const ww = window === "weekly" ? (windowWins.get(r.userId) ?? 0) : r.wins;
            return {
                rank: 0,
                userId: r.userId,
                sport: r.sport,
                elo: r.elo,
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
                if (b.windowWins !== a.windowWins)
                    return b.windowWins - a.windowWins;
            }
            if (b.elo !== a.elo)
                return b.elo - a.elo;
            if (b.wins !== a.wins)
                return b.wins - a.wins;
            return a.userId.localeCompare(b.userId);
        });
        let rank = 1;
        for (const e of entries) {
            e.rank = rank++;
        }
        return entries;
    }
    async applyRankingFromConfirmedChallenge(challengeId) {
        const ch = await this.challenges.getChallenge(challengeId);
        this.assertChallengeEligible(ch);
        if (await this.repo.hasRankingApplication(challengeId)) {
            const apps = await this.repo.listApplicationsForSport(ch.sport);
            const prev = apps.find((a) => a.challengeId === challengeId);
            const winnerPartyId = extractWinnerPartyId(ch.result, ch.creatorPartyId, ch.opponentPartyId);
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
        const winnerPartyId = extractWinnerPartyId(ch.result, ch.creatorPartyId, ch.opponentPartyId);
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
        winner = applyWinLossToRating(winner, "win", newWinnerElo, now);
        loser = applyWinLossToRating(loser, "loss", newLoserElo, now);
        await this.repo.saveUserRating(winner);
        await this.repo.saveUserRating(loser);
        const application = {
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
    assertChallengeEligible(ch) {
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
//# sourceMappingURL=service.js.map