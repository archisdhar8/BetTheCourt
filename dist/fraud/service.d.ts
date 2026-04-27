import type { ChallengeService } from "../challenges/service.js";
import type { CheckinService } from "../checkin/service.js";
import { type FraudEvaluationContext, type FraudEvaluationRecord } from "./model.js";
import type { FraudRepository } from "./repository.js";
export declare class FraudService {
    private readonly repo;
    private readonly challenges;
    private readonly checkin;
    constructor(repo: FraudRepository, challenges: ChallengeService, checkin: CheckinService);
    getLatestEvaluation(challengeId: string): Promise<FraudEvaluationRecord | null>;
    /** When a fraud evaluation exists and `payoutEligible` is false, ranking integration should skip the challenge. */
    blocksRankingIntegration(challengeId: string): Promise<boolean>;
    /**
     * Wallet path: run the same rules as `evaluate` but **do not** append a row.
     * Throws `FraudDomainError` when payout should not proceed automatically.
     */
    assertPayoutAllowed(challengeId: string): Promise<FraudEvaluationRecord>;
    /**
     * Persist an evaluation row (audit / ops). Scores are deterministic for identical inputs;
     * `version` increments on each call.
     */
    evaluate(input: {
        challengeId: string;
        context?: FraudEvaluationContext;
        emitPlaceholderSignals?: boolean;
    }): Promise<FraudEvaluationRecord>;
    private buildEvaluationRecord;
}
//# sourceMappingURL=service.d.ts.map