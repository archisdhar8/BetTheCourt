function fmtKm(km) {
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
export function buildDeterministicExplanation(input) {
    const { seeker, candidate, raw, quality, fairness, accept } = input;
    const parts = [];
    parts.push(`${fmtKm(raw.distanceKm)} away with strong distance fit (${(raw.distanceScore * 100).toFixed(0)}%).`);
    parts.push(`Skill gap is ${raw.skillDelta.toFixed(1)} points vs your configured band; skill fit scores ${(raw.skillFitScore * 100).toFixed(0)}%.`);
    parts.push(`Recent activity signal is ${(raw.activityScore * 100).toFixed(0)}%.`);
    if (raw.stakeOverlapScore >= 0.66) {
        parts.push("Stake preferences overlap well.");
    }
    else if (raw.stakeOverlapScore <= 0.1) {
        parts.push("Stake preferences only weakly overlap—expect more negotiation.");
    }
    else {
        parts.push("Stake preferences partially overlap.");
    }
    parts.push(`Reliability/trust composite is ${(raw.trustScore * 100).toFixed(0)}% (includes verification).`);
    if (raw.rematchPenaltyApplied) {
        parts.push("This is a recent opponent—ranking is down-weighted unless rivalry mode is enabled.");
    }
    parts.push(`Overall match quality ${(quality * 100).toFixed(0)}%, fairness confidence ${(fairness * 100).toFixed(0)}%, heuristic acceptance likelihood ${(accept * 100).toFixed(0)}%.`);
    const who = candidate.party === "user"
        ? `User ${candidate.userId}`
        : `Team ${candidate.teamId}${candidate.name ? ` (${candidate.name})` : ""}`;
    const you = seeker.kind === "user"
        ? `You (${seeker.userId})`
        : `Your team (${seeker.teamId}) are`;
    return `${who} is recommended for ${seeker.sport}: ${you} close in skill, within travel limits, and aligned on format. ${parts.join(" ")}`;
}
/**
 * Optional AI layer: pass a function that rewrites the deterministic explanation.
 * Keep this side-effect free besides calling the provider.
 */
export async function withAiExplanation(row, provider) {
    const prompt = [
        "Rewrite the following sports matchmaking explanation to be concise (max 3 sentences), friendly, and non-deceptive.",
        "Do not invent facts; only restate what is implied by numbers.",
        "Explanation:",
        row.explanation,
    ].join("\n");
    return provider(prompt);
}
//# sourceMappingURL=explanations.js.map