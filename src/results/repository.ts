import type { ResultVerificationBundle } from "./model.js";

/**
 * Persistence port: verification rounds separate from `Challenge` aggregate row.
 * Postgres: `result_verification_bundles` keyed by `challenge_id` (JSONB or normalized tables).
 */
export interface ResultsRepository {
  loadBundle(challengeId: string): Promise<ResultVerificationBundle | null>;
  saveBundle(bundle: ResultVerificationBundle): Promise<void>;
}

export class InMemoryResultsRepository implements ResultsRepository {
  private readonly store = new Map<string, ResultVerificationBundle>();

  async loadBundle(challengeId: string): Promise<ResultVerificationBundle | null> {
    return this.store.get(challengeId) ?? null;
  }

  async saveBundle(bundle: ResultVerificationBundle): Promise<void> {
    this.store.set(bundle.challengeId, bundle);
  }

  clear(): void {
    this.store.clear();
  }
}
