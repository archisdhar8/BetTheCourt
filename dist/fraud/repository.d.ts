import type { ChallengeHistorySnapshot, FraudEvaluationRecord, PartyFraudStats } from "./model.js";
/**
 * Persistence port: evaluations + historical snapshots for rules.
 * Postgres: `fraud_evaluations`, `challenge_fraud_snapshots`, `party_fraud_stats` tables.
 */
export interface FraudRepository {
    appendEvaluation(challengeId: string, record: FraudEvaluationRecord): Promise<void>;
    listEvaluations(challengeId: string): Promise<FraudEvaluationRecord[]>;
    getLatestEvaluation(challengeId: string): Promise<FraudEvaluationRecord | null>;
    listSnapshots(): Promise<ChallengeHistorySnapshot[]>;
    addSnapshot(snapshot: ChallengeHistorySnapshot): Promise<void>;
    getPartyStats(partyId: string): Promise<PartyFraudStats>;
}
export declare class InMemoryFraudRepository implements FraudRepository {
    private readonly evaluations;
    private snapshots;
    private readonly partyStats;
    appendEvaluation(challengeId: string, record: FraudEvaluationRecord): Promise<void>;
    listEvaluations(challengeId: string): Promise<FraudEvaluationRecord[]>;
    getLatestEvaluation(challengeId: string): Promise<FraudEvaluationRecord | null>;
    listSnapshots(): Promise<ChallengeHistorySnapshot[]>;
    addSnapshot(snapshot: ChallengeHistorySnapshot): Promise<void>;
    getPartyStats(partyId: string): Promise<PartyFraudStats>;
    /** Test / backfill helper — not part of the abstract port. */
    putPartyStats(stats: PartyFraudStats): void;
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map