const EARTH_RADIUS_KM = 6371;
function toRad(d) {
    return (d * Math.PI) / 180;
}
/** Haversine distance in kilometers. */
export function haversineKm(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function clamp01(x) {
    if (Number.isNaN(x))
        return 0;
    return Math.max(0, Math.min(1, x));
}
function hoursSince(iso, now) {
    const t = Date.parse(iso);
    if (Number.isNaN(t))
        return Number.POSITIVE_INFINITY;
    return Math.max(0, (now.getTime() - t) / 3_600_000);
}
/** Higher when candidate was active recently (exponential decay). */
export function activityScore(lastActiveAt, now, halfLifeHours) {
    const h = hoursSince(lastActiveAt, now);
    if (!Number.isFinite(h))
        return 0;
    return clamp01(Math.exp(-h / halfLifeHours));
}
/** Overlap length of two closed intervals on the minor-unit line, normalized by seeker span. */
export function stakeOverlapScore(seeker, candidate) {
    if (seeker.currency !== candidate.currency)
        return 0;
    const lo = Math.max(seeker.minMinor, candidate.minMinor);
    const hi = Math.min(seeker.maxMinor, candidate.maxMinor);
    const overlap = hi - lo;
    if (overlap <= 0)
        return 0;
    const seekerSpan = Math.max(1, seeker.maxMinor - seeker.minMinor);
    return clamp01(overlap / seekerSpan);
}
/** Simple overlap ratio: overlapping minutes / seeker window span (MVP). */
export function availabilityOverlapScore(seeker, candidate, now) {
    if (seeker.length === 0 || candidate.length === 0)
        return 0.5;
    const wd = now.getUTCDay();
    const seekerToday = seeker.filter((w) => w.weekday === wd);
    const candToday = candidate.filter((w) => w.weekday === wd);
    if (seekerToday.length === 0 || candToday.length === 0)
        return 0.25;
    let best = 0;
    for (const s of seekerToday) {
        const sSpan = Math.max(1, s.endMinute - s.startMinute);
        for (const c of candToday) {
            const lo = Math.max(s.startMinute, c.startMinute);
            const hi = Math.min(s.endMinute, c.endMinute);
            const overlap = hi - lo;
            if (overlap > 0)
                best = Math.max(best, overlap / sSpan);
        }
    }
    return clamp01(best);
}
export function skillFitScore(seekerRating, candidateRating, band) {
    const delta = Math.abs(seekerRating - candidateRating);
    if (band <= 0)
        return delta === 0 ? 1 : 0;
    return clamp01(1 - delta / band);
}
export function distanceScore(distanceKm, maxTravelKm) {
    if (maxTravelKm <= 0)
        return distanceKm === 0 ? 1 : 0;
    return clamp01(1 - distanceKm / maxTravelKm);
}
export function trustComposite(trust, verification) {
    const t = clamp01(trust / 100);
    const v = clamp01(verification / 100);
    return clamp01(0.65 * t + 0.35 * v);
}
export function isPastOpponent(seeker, candidate, rivalryMode) {
    if (rivalryMode)
        return false;
    if (seeker.kind === "user" && candidate.party === "user") {
        return seeker.pastOpponentIds.includes(candidate.userId);
    }
    if (seeker.kind === "team" && candidate.party === "team") {
        return seeker.pastOpponentTeamIds.includes(candidate.teamId);
    }
    return false;
}
export function formatCompatible(seeker, candidate) {
    const a = new Set(seeker.preferredFormats);
    return candidate.preferredFormats.some((f) => a.has(f));
}
export function computeRawScores(input) {
    const { seeker, candidate, now, config } = input;
    if (candidate.sport !== seeker.sport)
        return null;
    if (seeker.kind === "user" && candidate.party === "user" && candidate.userId === seeker.userId) {
        return null;
    }
    if (!formatCompatible(seeker, candidate))
        return null;
    const distanceKm = haversineKm(seeker.location, candidate.location);
    if (distanceKm > seeker.maxTravelDistanceKm)
        return null;
    const dScore = distanceScore(distanceKm, seeker.maxTravelDistanceKm);
    const skillDelta = Math.abs(seeker.skillRating - candidate.skillRating);
    const sFit = skillFitScore(seeker.skillRating, candidate.skillRating, config.skillRatingBand);
    const act = activityScore(candidate.lastActiveAt, now, config.activityHalfLifeHours);
    const stake = stakeOverlapScore(seeker.preferredStake, candidate.preferredStake);
    const trust = trustComposite(candidate.trustScore, candidate.verificationScore);
    const rematchPenaltyApplied = isPastOpponent(seeker, candidate, config.rivalryModeEnabled);
    const formatOverlap = formatCompatible(seeker, candidate);
    const availabilityScore = availabilityOverlapScore(seeker.availabilityUtc, candidate.availabilityUtc, now);
    return {
        distanceKm,
        distanceScore: dScore,
        skillDelta,
        skillFitScore: sFit,
        activityScore: act,
        stakeOverlapScore: stake,
        trustScore: trust,
        rematchPenaltyApplied,
        formatOverlap,
        availabilityScore,
    };
}
/**
 * Weighted match quality in [0, 1].
 * Rematch applies a multiplicative gate (not additive) so it cannot be washed out by other signals.
 */
export function compositeMatchQuality(raw, weights) {
    const wSum = weights.distance +
        weights.skillFit +
        weights.activity +
        weights.trust +
        weights.stakeOverlap +
        weights.rematch;
    if (wSum <= 0)
        return 0;
    const linear = (weights.distance * raw.distanceScore +
        weights.skillFit * raw.skillFitScore +
        weights.activity * raw.activityScore +
        weights.trust * raw.trustScore +
        weights.stakeOverlap * raw.stakeOverlapScore +
        weights.rematch * (raw.rematchPenaltyApplied ? 0.15 : 1)) /
        wSum;
    const availabilityBoost = 0.08 * raw.availabilityScore;
    return clamp01(linear * (raw.formatOverlap ? 1 : 0) + availabilityBoost);
}
/**
 * Fairness confidence: structural safety of the suggestion (tight skill + headroom inside travel cap + trust).
 */
export function fairnessConfidence(raw, seekerMaxTravelKm) {
    const distanceHeadroom = seekerMaxTravelKm <= 0 ? 0 : clamp01(1 - raw.distanceKm / seekerMaxTravelKm);
    const parts = [raw.skillFitScore, raw.trustScore, distanceHeadroom];
    const geoMean = parts.reduce((a, b) => a * b, 1) ** (1 / parts.length);
    return clamp01(geoMean);
}
/**
 * Heuristic acceptance likelihood (not a calibrated ML model).
 * Increases with composite quality and trust; decreases with rematches and skill tension.
 */
export function acceptanceLikelihood(quality, raw) {
    const skillTension = clamp01(raw.skillDelta / Math.max(1, raw.skillFitScore * 20 + 1e-6));
    const stakeGap = 1 - raw.stakeOverlapScore;
    const base = 0.22 + 0.62 * quality + 0.12 * raw.trustScore;
    const penalty = 0.18 * (raw.rematchPenaltyApplied ? 1 : 0) + 0.1 * skillTension + 0.08 * stakeGap;
    return clamp01(base - penalty);
}
//# sourceMappingURL=scoring.js.map