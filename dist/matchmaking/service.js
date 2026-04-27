import { buildDeterministicExplanation } from "./explanations.js";
import { acceptanceLikelihood, compositeMatchQuality, computeRawScores, fairnessConfidence, } from "./scoring.js";
export const DEFAULT_MATCHMAKING_CONFIG = {
    skillRatingBand: 8,
    activityHalfLifeHours: 36,
    rivalryModeEnabled: false,
    weights: {
        distance: 0.22,
        skillFit: 0.26,
        activity: 0.14,
        trust: 0.18,
        stakeOverlap: 0.12,
        rematch: 0.08,
    },
};
function seekerPartyRef(seeker) {
    return seeker.kind === "user"
        ? { party: "user", userId: seeker.userId }
        : { party: "team", teamId: seeker.teamId };
}
function candidatePartyRef(c) {
    return c.party === "user"
        ? { party: "user", userId: c.userId }
        : { party: "team", teamId: c.teamId };
}
function candidateLabel(c) {
    if (c.party === "user")
        return c.displayName;
    return c.name;
}
/** MVP pairing rule: users match users; teams match teams. */
function candidateAllowed(seeker, candidate) {
    if (seeker.kind === "user")
        return candidate.party === "user";
    return candidate.party === "team";
}
export async function recommendMatches(input) {
    const now = input.now ?? new Date();
    const config = {
        ...DEFAULT_MATCHMAKING_CONFIG,
        ...input.config,
        weights: { ...DEFAULT_MATCHMAKING_CONFIG.weights, ...input.config?.weights },
        /** API/config override > seeker flag > default. */
        rivalryModeEnabled: input.config?.rivalryModeEnabled ??
            input.seeker.rivalryModeEnabled ??
            DEFAULT_MATCHMAKING_CONFIG.rivalryModeEnabled,
    };
    const rows = [];
    for (const candidate of input.candidates) {
        if (!candidateAllowed(input.seeker, candidate))
            continue;
        const raw = computeRawScores({ seeker: input.seeker, candidate, now, config });
        if (!raw)
            continue;
        const quality = compositeMatchQuality(raw, config.weights);
        const fairness = fairnessConfidence(raw, input.seeker.maxTravelDistanceKm);
        const accept = acceptanceLikelihood(quality, raw);
        let explanation = buildDeterministicExplanation({
            seeker: input.seeker,
            candidate,
            raw,
            quality,
            fairness,
            accept,
        });
        const base = {
            opponent: candidatePartyRef(candidate),
            displayLabel: candidateLabel(candidate),
            matchQualityScore: quality,
            fairnessConfidence: fairness,
            acceptanceLikelihood: accept,
            explanation,
            featureBreakdown: {
                distanceKm: raw.distanceKm,
                distanceScore: raw.distanceScore,
                skillDelta: raw.skillDelta,
                skillFitScore: raw.skillFitScore,
                activityScore: raw.activityScore,
                availabilityScore: raw.availabilityScore,
                stakeOverlapScore: raw.stakeOverlapScore,
                trustScore: raw.trustScore,
                rematchPenaltyApplied: raw.rematchPenaltyApplied,
                formatOverlap: raw.formatOverlap,
            },
        };
        if (input.explanationHook) {
            explanation = await input.explanationHook(base);
            base.explanation = explanation;
        }
        rows.push(base);
    }
    rows.sort((a, b) => {
        const primary = b.matchQualityScore - a.matchQualityScore;
        if (primary !== 0)
            return primary;
        return b.acceptanceLikelihood - a.acceptanceLikelihood;
    });
    return {
        seeker: seekerPartyRef(input.seeker),
        sport: input.seeker.sport,
        generatedAt: now.toISOString(),
        recommendations: rows,
    };
}
//# sourceMappingURL=service.js.map