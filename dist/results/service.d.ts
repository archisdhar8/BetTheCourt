import type { Actor } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import { type ResultPayload, type ResultsView } from "./model.js";
import type { ResultsRepository } from "./repository.js";
export declare class ResultsService {
    private readonly repo;
    private readonly challenges;
    constructor(repo: ResultsRepository, challenges: ChallengeService);
    getResultsView(challengeId: string): Promise<ResultsView>;
    /**
     * First result submission: allowed in **`scheduled`** (or **`completed`** with no prior round — unused in MVP).
     * Persists verification round then runs `complete_match` on the challenge.
     */
    submitResult(input: {
        challengeId: string;
        actor: Actor;
        payload: ResultPayload;
    }): Promise<ResultsView>;
    confirmResult(input: {
        challengeId: string;
        actor: Actor;
        note?: string;
        /** If set, must equal the active round fingerprint or confirm is rejected. */
        ackFingerprint?: string;
    }): Promise<ResultsView>;
    disputeResult(input: {
        challengeId: string;
        actor: Actor;
        reason: string;
        counterPayload?: ResultPayload;
    }): Promise<ResultsView>;
}
//# sourceMappingURL=service.d.ts.map