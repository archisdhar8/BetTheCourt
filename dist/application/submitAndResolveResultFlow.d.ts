import type { ResultPayload } from "../results/model.js";
import type { Actor } from "../challenges/model.js";
import type { ApplicationDeps } from "./model.js";
/**
 * Records a result and notifies the counterparty (`result_submitted`).
 * Domain validation lives in `ResultsService.submitResult`.
 */
export declare function submitResultFlow(deps: ApplicationDeps, input: {
    challengeId: string;
    actor: Actor;
    payload: ResultPayload;
}): Promise<{
    resultsView: import("../results/model.js").ResultsView;
    challenge: import("../challenges/model.js").Challenge;
}>;
/**
 * Confirms the pending result; on `confirmed`, notifies the original submitter (`result_confirmed`).
 */
export declare function confirmResultFlow(deps: ApplicationDeps, input: {
    challengeId: string;
    actor: Actor;
    note?: string;
    ackFingerprint?: string;
}): Promise<{
    resultsView: import("../results/model.js").ResultsView;
    challenge: import("../challenges/model.js").Challenge;
}>;
/**
 * Opens a dispute from the counterparty; notifies both parties (`dispute_opened`).
 */
export declare function disputeResultFlow(deps: ApplicationDeps, input: {
    challengeId: string;
    actor: Actor;
    reason: string;
    counterPayload?: ResultPayload;
}): Promise<{
    resultsView: import("../results/model.js").ResultsView;
    challenge: import("../challenges/model.js").Challenge;
}>;
//# sourceMappingURL=submitAndResolveResultFlow.d.ts.map