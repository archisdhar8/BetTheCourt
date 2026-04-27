import { randomUUID } from "node:crypto";
export class InMemoryRankingRepository {
    ratings = new Map();
    applications = [];
    appliedChallengeIds = new Set();
    key(userId, sport) {
        return `${userId}::${sport}`;
    }
    async getUserRating(userId, sport) {
        return this.ratings.get(this.key(userId, sport)) ?? null;
    }
    async saveUserRating(row) {
        this.ratings.set(this.key(row.userId, row.sport), { ...row });
    }
    async listRatingsForSport(sport) {
        return [...this.ratings.values()].filter((r) => r.sport === sport);
    }
    async hasRankingApplication(challengeId) {
        return this.appliedChallengeIds.has(challengeId);
    }
    async appendApplication(rec) {
        this.applications.push(rec);
        this.appliedChallengeIds.add(rec.challengeId);
    }
    async listApplicationsForSport(sport) {
        return this.applications.filter((a) => a.sport === sport);
    }
    clear() {
        this.ratings.clear();
        this.applications.length = 0;
        this.appliedChallengeIds.clear();
    }
}
export function newRankingApplicationId() {
    return `rapp_${randomUUID()}`;
}
//# sourceMappingURL=repository.js.map