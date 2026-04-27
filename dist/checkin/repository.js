export class InMemoryCheckinRepository {
    store = new Map();
    async loadBundle(challengeId) {
        return this.store.get(challengeId) ?? null;
    }
    async saveBundle(bundle) {
        this.store.set(bundle.challengeId, bundle);
    }
    clear() {
        this.store.clear();
    }
}
//# sourceMappingURL=repository.js.map