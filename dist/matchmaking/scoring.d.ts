import type { Candidate, MatchmakingConfig, MoneyRange, SeekerProfile, TimeWindow } from "./model.js";
/** Haversine distance in kilometers. */
export declare function haversineKm(a: {
    lat: number;
    lng: number;
}, b: {
    lat: number;
    lng: number;
}): number;
export declare function clamp01(x: number): number;
/** Higher when candidate was active recently (exponential decay). */
export declare function activityScore(lastActiveAt: string, now: Date, halfLifeHours: number): number;
/** Overlap length of two closed intervals on the minor-unit line, normalized by seeker span. */
export declare function stakeOverlapScore(seeker: MoneyRange, candidate: MoneyRange): number;
/** Simple overlap ratio: overlapping minutes / seeker window span (MVP). */
export declare function availabilityOverlapScore(seeker: TimeWindow[], candidate: TimeWindow[], now: Date): number;
export declare function skillFitScore(seekerRating: number, candidateRating: number, band: number): number;
export declare function distanceScore(distanceKm: number, maxTravelKm: number): number;
export declare function trustComposite(trust: number, verification: number): number;
export declare function isPastOpponent(seeker: SeekerProfile, candidate: Candidate, rivalryMode: boolean): boolean;
export declare function formatCompatible(seeker: SeekerProfile, candidate: Candidate): boolean;
export type RawScores = {
    distanceKm: number;
    distanceScore: number;
    skillDelta: number;
    skillFitScore: number;
    activityScore: number;
    stakeOverlapScore: number;
    trustScore: number;
    rematchPenaltyApplied: boolean;
    formatOverlap: boolean;
    availabilityScore: number;
};
export declare function computeRawScores(input: {
    seeker: SeekerProfile;
    candidate: Candidate;
    now: Date;
    config: MatchmakingConfig;
}): RawScores | null;
/**
 * Weighted match quality in [0, 1].
 * Rematch applies a multiplicative gate (not additive) so it cannot be washed out by other signals.
 */
export declare function compositeMatchQuality(raw: RawScores, weights: MatchmakingConfig["weights"]): number;
/**
 * Fairness confidence: structural safety of the suggestion (tight skill + headroom inside travel cap + trust).
 */
export declare function fairnessConfidence(raw: RawScores, seekerMaxTravelKm: number): number;
/**
 * Heuristic acceptance likelihood (not a calibrated ML model).
 * Increases with composite quality and trust; decreases with rematches and skill tension.
 */
export declare function acceptanceLikelihood(quality: number, raw: RawScores): number;
//# sourceMappingURL=scoring.d.ts.map