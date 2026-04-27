import type { ChallengeHistorySnapshot, FraudEvaluationRecord, PartyFraudStats } from "./model.js";

const defaultPartyStats = (partyId: string): PartyFraudStats => ({
  partyId,
  disputeCount: 0,
  refundOrCancelCount: 0,
  confirmedCompletedCount: 0,
});

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

export class InMemoryFraudRepository implements FraudRepository {
  private readonly evaluations = new Map<string, FraudEvaluationRecord[]>();
  private snapshots: ChallengeHistorySnapshot[] = [];
  private readonly partyStats = new Map<string, PartyFraudStats>();

  async appendEvaluation(challengeId: string, record: FraudEvaluationRecord): Promise<void> {
    const cur = this.evaluations.get(challengeId) ?? [];
    cur.push(record);
    this.evaluations.set(challengeId, cur);
  }

  async listEvaluations(challengeId: string): Promise<FraudEvaluationRecord[]> {
    return [...(this.evaluations.get(challengeId) ?? [])];
  }

  async getLatestEvaluation(challengeId: string): Promise<FraudEvaluationRecord | null> {
    const list = this.evaluations.get(challengeId) ?? [];
    return list.length === 0 ? null : list[list.length - 1]!;
  }

  async listSnapshots(): Promise<ChallengeHistorySnapshot[]> {
    return [...this.snapshots];
  }

  async addSnapshot(snapshot: ChallengeHistorySnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  async getPartyStats(partyId: string): Promise<PartyFraudStats> {
    return this.partyStats.get(partyId) ?? defaultPartyStats(partyId);
  }

  /** Test / backfill helper — not part of the abstract port. */
  putPartyStats(stats: PartyFraudStats): void {
    this.partyStats.set(stats.partyId, { ...stats });
  }

  clear(): void {
    this.evaluations.clear();
    this.snapshots = [];
    this.partyStats.clear();
  }
}
