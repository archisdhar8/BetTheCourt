export class InMemorySchedulingRepository {
    store = new Map();
    async loadSession(challengeId) {
        return this.store.get(challengeId) ?? null;
    }
    async saveSession(session) {
        this.store.set(session.challengeId, session);
    }
    clear() {
        this.store.clear();
    }
}
//# sourceMappingURL=repository.js.map