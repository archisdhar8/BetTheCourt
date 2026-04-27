import type { Challenge } from "./model.js";
/**
 * Persistence port. Swap for Postgres + outbox without changing domain/service.
 */
export interface ChallengeRepository {
    create(challenge: Challenge): Promise<void>;
    getById(id: string): Promise<Challenge | null>;
    save(challenge: Challenge): Promise<void>;
}
export declare class InMemoryChallengeRepository implements ChallengeRepository {
    private readonly store;
    create(challenge: Challenge): Promise<void>;
    getById(id: string): Promise<Challenge | null>;
    save(challenge: Challenge): Promise<void>;
    /** Test helper / admin tooling — not an HTTP contract. */
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map