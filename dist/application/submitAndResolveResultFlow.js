import { counterpartyPartyId } from "./model.js";
/**
 * Records a result and notifies the counterparty (`result_submitted`).
 * Domain validation lives in `ResultsService.submitResult`.
 */
export async function submitResultFlow(deps, input) {
    const before = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.submitResult(input);
    const after = await deps.challenges.getChallenge(input.challengeId);
    if (input.actor.kind === "party") {
        const recipient = counterpartyPartyId(before, input.actor.partyId);
        if (recipient) {
            await deps.notifications.notify({
                userId: recipient,
                type: "result_submitted",
                title: "Result submitted",
                body: "Your opponent submitted a match result. Please confirm or dispute.",
                metadata: { challengeId: after.id },
            });
        }
    }
    return { resultsView: view, challenge: after };
}
/**
 * Confirms the pending result; on `confirmed`, notifies the original submitter (`result_confirmed`).
 */
export async function confirmResultFlow(deps, input) {
    const before = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.confirmResult(input);
    const after = await deps.challenges.getChallenge(input.challengeId);
    if (before.state !== "confirmed" && after.state === "confirmed" && after.completedByPartyId) {
        await deps.notifications.notify({
            userId: after.completedByPartyId,
            type: "result_confirmed",
            title: "Result confirmed",
            body: "Your opponent confirmed the submitted result.",
            metadata: { challengeId: after.id },
        });
    }
    return { resultsView: view, challenge: after };
}
/**
 * Opens a dispute from the counterparty; notifies both parties (`dispute_opened`).
 */
export async function disputeResultFlow(deps, input) {
    const before = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.results.disputeResult(input);
    const after = await deps.challenges.getChallenge(input.challengeId);
    if (before.state !== "disputed" && after.state === "disputed") {
        const meta = { challengeId: after.id, reason: input.reason };
        await deps.notifications.notify({
            userId: after.creatorPartyId,
            type: "dispute_opened",
            title: "Result disputed",
            body: "A dispute was opened on this challenge result.",
            metadata: meta,
        });
        await deps.notifications.notify({
            userId: after.opponentPartyId,
            type: "dispute_opened",
            title: "Result disputed",
            body: "A dispute was opened on this challenge result.",
            metadata: meta,
        });
    }
    return { resultsView: view, challenge: after };
}
//# sourceMappingURL=submitAndResolveResultFlow.js.map