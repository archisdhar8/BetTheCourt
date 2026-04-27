function fmtKm(km) {
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
export function buildDeterministicVenueExplanation(input) {
    const { venue, participants, ranked } = input;
    const home = ranked.homeCourt ? " Home-court / affiliated venue: label clearly for both sides." : "";
    const travelBits = ranked.travels
        .map((t) => `${t.partyId} ~${fmtKm(t.distanceKm)} (~${Math.round(t.estimatedTimeMinutes)} min)`)
        .join("; ");
    return (`${venue.name ?? venue.id} (${venue.venueType}, ${venue.sports.join(", ")}): ` +
        `centrality ${(ranked.centralityScore * 100).toFixed(0)}%, travel-fairness ${(ranked.fairnessScore * 100).toFixed(0)}%, ` +
        `preference fit ${(ranked.preferenceMatchScore * 100).toFixed(0)}%, suitability ${(ranked.suitabilityScore * 100).toFixed(0)}%. ` +
        `Per-party travel: ${travelBits}. ` +
        `Imbalance ${fmtKm(ranked.travelImbalanceKm)} across ${participants.length} parties; ` +
        `availability confidence ${(ranked.availabilityConfidence * 100).toFixed(0)}%.${home}`);
}
export async function withVenueAiExplanation(row, provider) {
    const prompt = [
        "Rewrite the following venue recommendation explanation to be concise (max 3 sentences), friendly, and faithful.",
        "Do not invent amenities not implied by the numbers.",
        "Explanation:",
        row.explanation,
    ].join("\n");
    return provider(prompt);
}
//# sourceMappingURL=explanations.js.map