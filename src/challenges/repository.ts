import type { Challenge } from "./model.js";

/**
 * Persistence port. Swap for Postgres + outbox without changing domain/service.
 */
export interface ChallengeRepository {
  create(challenge: Challenge): Promise<void>;
  getById(id: string): Promise<Challenge | null>;
  listAll(): Promise<Challenge[]>;
  save(challenge: Challenge): Promise<void>;
}

export class InMemoryChallengeRepository implements ChallengeRepository {
  private readonly store = new Map<string, Challenge>();

  async create(challenge: Challenge): Promise<void> {
    this.store.set(challenge.id, challenge);
  }

  async getById(id: string): Promise<Challenge | null> {
    return this.store.get(id) ?? null;
  }

  async listAll(): Promise<Challenge[]> {
    return [...this.store.values()];
  }

  async save(challenge: Challenge): Promise<void> {
    if (!this.store.has(challenge.id)) {
      throw new Error(`Challenge ${challenge.id} not found for save`);
    }
    this.store.set(challenge.id, challenge);
  }

  /** Test helper / admin tooling — not an HTTP contract. */
  clear(): void {
    this.store.clear();
  }
}
