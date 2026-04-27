import type { Candidate, MatchmakingConfig, MatchmakingResult, PartialMatchmakingConfig, RankedOpponent, SeekerProfile } from "./model.js";
export declare const DEFAULT_MATCHMAKING_CONFIG: MatchmakingConfig;
export type RecommendMatchesInput = {
    seeker: SeekerProfile;
    candidates: Candidate[];
    now?: Date;
    config?: PartialMatchmakingConfig;
    /** Optional hook to replace/augment explanations (e.g. LLM). */
    explanationHook?: (row: RankedOpponent) => Promise<string>;
};
export declare function recommendMatches(input: RecommendMatchesInput): Promise<MatchmakingResult>;
//# sourceMappingURL=service.d.ts.map