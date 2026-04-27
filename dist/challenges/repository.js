export class InMemoryChallengeRepository {
    store = new Map();
    async create(challenge) {
        this.store.set(challenge.id, challenge);
    }
    async getById(id) {
        return this.store.get(id) ?? null;
    }
    async save(challenge) {
        if (!this.store.has(challenge.id)) {
            throw new Error(`Challenge ${challenge.id} not found for save`);
        }
        this.store.set(challenge.id, challenge);
    }
    /** Test helper / admin tooling — not an HTTP contract. */
    clear() {
        this.store.clear();
    }
}
//# sourceMappingURL=repository.js.map