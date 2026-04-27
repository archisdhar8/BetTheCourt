const defaultPartyStats = (partyId) => ({
    partyId,
    disputeCount: 0,
    refundOrCancelCount: 0,
    confirmedCompletedCount: 0,
});
export class InMemoryFraudRepository {
    evaluations = new Map();
    snapshots = [];
    partyStats = new Map();
    async appendEvaluation(challengeId, record) {
        const cur = this.evaluations.get(challengeId) ?? [];
        cur.push(record);
        this.evaluations.set(challengeId, cur);
    }
    async listEvaluations(challengeId) {
        return [...(this.evaluations.get(challengeId) ?? [])];
    }
    async getLatestEvaluation(challengeId) {
        const list = this.evaluations.get(challengeId) ?? [];
        return list.length === 0 ? null : list[list.length - 1];
    }
    async listSnapshots() {
        return [...this.snapshots];
    }
    async addSnapshot(snapshot) {
        this.snapshots.push(snapshot);
    }
    async getPartyStats(partyId) {
        return this.partyStats.get(partyId) ?? defaultPartyStats(partyId);
    }
    /** Test / backfill helper — not part of the abstract port. */
    putPartyStats(stats) {
        this.partyStats.set(stats.partyId, { ...stats });
    }
    clear() {
        this.evaluations.clear();
        this.snapshots = [];
        this.partyStats.clear();
    }
}
//# sourceMappingURL=repository.js.map