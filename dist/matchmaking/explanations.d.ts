import type { Candidate, RankedOpponent, SeekerProfile } from "./model.js";
import type { RawScores } from "./scoring.js";
export declare function buildDeterministicExplanation(input: {
    seeker: SeekerProfile;
    candidate: Candidate;
    raw: RawScores;
    quality: number;
    fairness: number;
    accept: number;
}): string;
/**
 * Optional AI layer: pass a function that rewrites the deterministic explanation.
 * Keep this side-effect free besides calling the provider.
 */
export declare function withAiExplanation(row: RankedOpponent, provider: (prompt: string) => Promise<string>): Promise<string>;
//# sourceMappingURL=explanations.d.ts.map