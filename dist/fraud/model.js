/** MVP deterministic signals; extend for ML overlays later. */
export const FRAUD_SIGNAL_IDS = [
    "repeated_same_pair_matches",
    "repeated_same_winner_pattern",
    "no_valid_checkins",
    "only_one_party_checked_in",
    "result_without_presence_confidence",
    "high_dispute_rate",
    "excessive_refunds_or_cancellations",
    "suspicious_fast_repeat_matches",
    "payout_attempt_before_low_risk_clearance",
    "home_court_bias_pattern",
];
export class FraudDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 409;
        this.details = input.details;
        this.name = "FraudDomainError";
    }
}
function pairKey(a, b) {
    return [a, b].sort().join("::");
}
export function samePair(a, b, c, d) {
    return pairKey(a, b) === pairKey(c, d);
}
export function extractWinnerPartyId(result, creatorPartyId, opponentPartyId) {
    if (!result)
        return undefined;
    const w = result.winnerPartyId;
    if (typeof w === "string" && (w === creatorPartyId || w === opponentPartyId))
        return w;
    const w2 = result.winner;
    if (typeof w2 === "string" && (w2 === creatorPartyId || w2 === opponentPartyId))
        return w2;
    return undefined;
}
/** Deterministic rules → raw score in [0,1], signals, action, payout gate. */
export function evaluateDeterministicRules(input) {
    const signals = [];
    let raw = 0;
    const ch = input.challenge;
    const scheduledLike = Boolean(ch.scheduleProposal?.startAt);
    if (input.pairPriorMatchCount >= 8) {
        signals.push({
            id: "repeated_same_pair_matches",
            weight: 0.28,
            detail: `pair_prior_matches=${input.pairPriorMatchCount}`,
        });
        raw += 0.28;
    }
    else if (input.pairPriorMatchCount >= 4) {
        signals.push({
            id: "repeated_same_pair_matches",
            weight: 0.14,
            detail: `pair_prior_matches=${input.pairPriorMatchCount}`,
        });
        raw += 0.14;
    }
    if (input.sameWinnerStreakLength >= 4) {
        signals.push({
            id: "repeated_same_winner_pattern",
            weight: 0.22,
            detail: `streak=${input.sameWinnerStreakLength}`,
        });
        raw += 0.22;
    }
    else if (input.sameWinnerStreakLength >= 3) {
        signals.push({
            id: "repeated_same_winner_pattern",
            weight: 0.12,
            detail: `streak=${input.sameWinnerStreakLength}`,
        });
        raw += 0.12;
    }
    if (input.hasConfirmedResultPath && scheduledLike && !input.bothPartiesValidCheckin) {
        signals.push({ id: "no_valid_checkins", weight: 0.1, detail: "confirmed_without_dual_valid_checkin" });
        raw += 0.1;
    }
    if (input.hasAnyCheckinRecord && input.creatorCheckinValid !== input.opponentCheckinValid) {
        signals.push({ id: "only_one_party_checked_in", weight: 0.12 });
        raw += 0.12;
    }
    if (input.hasConfirmedResultPath && !input.bothPartiesValidCheckin) {
        signals.push({ id: "result_without_presence_confidence", weight: 0.08 });
        raw += 0.08;
    }
    const disputeRate = (party) => {
        const den = Math.max(1, party.confirmedCompletedCount + party.disputeCount);
        return party.disputeCount / den;
    };
    if (disputeRate(input.creatorStats) > 0.35 || disputeRate(input.opponentStats) > 0.35) {
        signals.push({
            id: "high_dispute_rate",
            weight: 0.2,
            detail: `creator=${disputeRate(input.creatorStats).toFixed(2)},opponent=${disputeRate(input.opponentStats).toFixed(2)}`,
        });
        raw += 0.2;
    }
    const refundExcess = 6;
    if (input.creatorStats.refundOrCancelCount >= refundExcess ||
        input.opponentStats.refundOrCancelCount >= refundExcess) {
        signals.push({
            id: "excessive_refunds_or_cancellations",
            weight: 0.18,
            detail: `threshold=${refundExcess}`,
        });
        raw += 0.18;
    }
    if (input.pairFastRepeatDetected) {
        signals.push({ id: "suspicious_fast_repeat_matches", weight: 0.16 });
        raw += 0.16;
    }
    if (input.context === "payout_attempt" && input.priorEvaluationCount === 0 && raw > 0.12) {
        signals.push({
            id: "payout_attempt_before_low_risk_clearance",
            weight: 0.06,
            detail: "no_prior_fraud_evaluation_on_file",
        });
        raw += 0.06;
    }
    if (input.emitPlaceholderSignals) {
        signals.push({
            id: "home_court_bias_pattern",
            weight: 0,
            detail: "placeholder_reserved_for_future_models",
        });
    }
    const fraudScore = Math.min(1, Math.round(raw * 1000) / 1000);
    let recommendedAction;
    let payoutEligible;
    if (fraudScore >= 0.72) {
        recommendedAction = "manual_review";
        payoutEligible = false;
    }
    else if (fraudScore >= 0.42) {
        recommendedAction = "hold_payout";
        payoutEligible = false;
    }
    else if (fraudScore >= 0.22) {
        recommendedAction = "flag";
        payoutEligible = true;
    }
    else {
        recommendedAction = "allow";
        payoutEligible = true;
    }
    const explanation = signals.length === 0
        ? "No fraud heuristics triggered; activity appears within normal parameters."
        : `Triggered: ${signals
            .filter((s) => s.weight > 0)
            .map((s) => s.id)
            .join(", ")}.`;
    return { fraudScore, signals, recommendedAction, explanation, payoutEligible };
}
//# sourceMappingURL=model.js.map