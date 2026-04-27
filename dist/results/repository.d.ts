import type { ResultVerificationBundle } from "./model.js";
/**
 * Persistence port: verification rounds separate from `Challenge` aggregate row.
 * Postgres: `result_verification_bundles` keyed by `challenge_id` (JSONB or normalized tables).
 */
export interface ResultsRepository {
    loadBundle(challengeId: string): Promise<ResultVerificationBundle | null>;
    saveBundle(bundle: ResultVerificationBundle): Promise<void>;
}
export declare class InMemoryResultsRepository implements ResultsRepository {
    private readonly store;
    loadBundle(challengeId: string): Promise<ResultVerificationBundle | null>;
    saveBundle(bundle: ResultVerificationBundle): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map