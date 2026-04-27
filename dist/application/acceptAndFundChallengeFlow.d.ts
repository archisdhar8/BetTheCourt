import type { ApplicationDeps, AcceptAndFundChallengeFlowInput } from "./model.js";
/**
 * Opponent accepts, both stakes lock via wallet, challenge may become `funded`.
 * Emits `challenge_accepted` after accept and `funds_locked` once both sides are locked (funded).
 */
export declare function acceptAndFundChallengeFlow(deps: ApplicationDeps, input: AcceptAndFundChallengeFlowInput): Promise<{
    challenge: import("../challenges/model.js").Challenge;
    creatorLock: import("../wallet/service.js").LockStakeResult;
    opponentLock: import("../wallet/service.js").LockStakeResult;
}>;
//# sourceMappingURL=acceptAndFundChallengeFlow.d.ts.map