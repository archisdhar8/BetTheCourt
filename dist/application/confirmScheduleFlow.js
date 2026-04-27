/**
 * Confirms a slot via `SchedulingService` (which already requires `funded` + venue).
 * When the challenge becomes `scheduled`, emits `schedule_confirmed` to both parties.
 */
export async function confirmScheduleFlow(deps, input) {
    const before = await deps.challenges.getChallenge(input.challengeId);
    const view = await deps.scheduling.confirmSlot(input);
    const after = await deps.challenges.getChallenge(input.challengeId);
    if (before.state !== "scheduled" && after.state === "scheduled") {
        await deps.notifications.notify({
            userId: after.creatorPartyId,
            type: "schedule_confirmed",
            title: "Schedule confirmed",
            body: "The match time is confirmed.",
            metadata: { challengeId: after.id, slot: after.scheduleProposal },
        });
        await deps.notifications.notify({
            userId: after.opponentPartyId,
            type: "schedule_confirmed",
            title: "Schedule confirmed",
            body: "The match time is confirmed.",
            metadata: { challengeId: after.id, slot: after.scheduleProposal },
        });
    }
    return { scheduleView: view, challenge: after };
}
//# sourceMappingURL=confirmScheduleFlow.js.map