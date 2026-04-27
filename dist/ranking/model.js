export const DEFAULT_ELO = 1500;
export const K_FACTOR = 32;
export class RankingDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "RankingDomainError";
    }
}
/** Standard ELO expected score for player A vs B. */
export function expectedScore(ra, rb) {
    return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}
/** Update ELO after a decisive match (A wins if `scoreA` is 1). */
export function computeEloUpdate(ra, rb, scoreA) {
    const ea = expectedScore(ra, rb);
    const eb = 1 - ea;
    const sa = scoreA;
    const sb = (1 - scoreA);
    const newRa = ra + K_FACTOR * (sa - ea);
    const newRb = rb + K_FACTOR * (sb - eb);
    return {
        newRa: Math.round(newRa * 100) / 100,
        newRb: Math.round(newRb * 100) / 100,
    };
}
/** Monday 00:00:00.000Z for the ISO week containing `d` (week starts Monday). */
export function startOfUtcIsoWeek(d) {
    const day = d.getUTCDay();
    const delta = day === 0 ? -6 : 1 - day;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta, 0, 0, 0, 0));
}
//# sourceMappingURL=model.js.map