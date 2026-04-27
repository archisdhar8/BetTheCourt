/**
 * Confirms a slot via `SchedulingService` (which already requires `funded` + venue).
 * When the challenge becomes `scheduled`, emits `schedule_confirmed` to both parties.
 */
export async function confirmScheduleFlow(deps, input) {
    const challengeBefore = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.scheduling.confirmSlot(input);
    const challengeAfter = await deps.challenges.getChallenge(input.challengeId);
    if (challengeBefore.state !== "scheduled" && challengeAfter.state === "scheduled") {
        await deps.notifications.notify({
            userId: challengeAfter.creatorPartyId,
            type: "schedule_confirmed",
            title: "Schedule confirmed",
            body: "The match time is confirmed.",
            metadata: { challengeId: challengeAfter.id, slot: challengeAfter.scheduleProposal },
        });
        await deps.notifications.notify({
            userId: challengeAfter.opponentPartyId,
            type: "schedule_confirmed",
            title: "Schedule confirmed",
            body: "The match time is confirmed.",
            metadata: { challengeId: challengeAfter.id, slot: challengeAfter.scheduleProposal },
        });
    }
    return { scheduleView: view, challenge: challengeAfter };
}
//# sourceMappingURL=confirmScheduleFlow.js.map