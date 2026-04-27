import { counterpartyPartyId } from "./model.js";
/**
 * Records a result and notifies the counterparty (`result_submitted`).
 * Domain validation lives in `ResultsService.submitResult`.
 */
export async function submitResultFlow(deps, input) {
    const challengeBefore = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.submitResult(input);
    const challengeAfter = await deps.challenges.getChallenge(input.challengeId);
    if (input.actor.kind === "party") {
        const recipient = counterpartyPartyId(challengeBefore, input.actor.partyId);
        if (recipient) {
            await deps.notifications.notify({
                userId: recipient,
                type: "result_submitted",
                title: "Result submitted",
                body: "Your opponent submitted a match result. Please confirm or dispute.",
                metadata: { challengeId: challengeAfter.id },
            });
        }
    }
    return { resultsView: view, challenge: challengeAfter };
}
/**
 * Confirms the pending result; on `confirmed`, notifies the original submitter (`result_confirmed`).
 */
export async function confirmResultFlow(deps, input) {
    const challengeBefore = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.confirmResult(input);
    const challengeAfter = await deps.challenges.getChallenge(input.challengeId);
    if (challengeBefore.state !== "confirmed" &&
        challengeAfter.state === "confirmed" &&
        challengeAfter.completedByPartyId) {
        await deps.notifications.notify({
            userId: challengeAfter.completedByPartyId,
            type: "result_confirmed",
            title: "Result confirmed",
            body: "Your opponent confirmed the submitted result.",
            metadata: { challengeId: challengeAfter.id },
        });
    }
    return { resultsView: view, challenge: challengeAfter };
}
/**
 * Opens a dispute from the counterparty; notifies both parties (`dispute_opened`).
 */
export async function disputeResultFlow(deps, input) {
    const beforeChallenge = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.disputeResult(input);
    const afterChallenge = await deps.challenges.getChallenge(input.challengeId);
    if (beforeChallenge.state === "completed" && afterChallenge.state === "disputed") {
        const meta = { challengeId: afterChallenge.id, reason: input.reason };
        await deps.notifications.notify({
            userId: afterChallenge.creatorPartyId,
            type: "dispute_opened",
            title: "Result disputed",
            body: "A dispute was opened on this challenge result.",
            metadata: meta,
        });
        await deps.notifications.notify({
            userId: afterChallenge.opponentPartyId,
            type: "dispute_opened",
            title: "Result disputed",
            body: "A dispute was opened on this challenge result.",
            metadata: meta,
        });
    }
    return { resultsView: view, challenge: afterChallenge };
}
//# sourceMappingURL=submitAndResolveResultFlow.js.map