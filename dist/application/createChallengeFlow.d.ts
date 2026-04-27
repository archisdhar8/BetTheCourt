import type { ApplicationDeps, CreateChallengeFlowInput } from "./model.js";
/**
 * Creates a challenge, optionally attaches a venue, notifies the opponent.
 * Does not validate sport/mode beyond `ChallengeService.createChallenge`.
 */
export declare function createChallengeFlow(deps: ApplicationDeps, input: CreateChallengeFlowInput): Promise<{
    challenge: import("../challenges/model.js").Challenge;
}>;
//# sourceMappingURL=createChallengeFlow.d.ts.map