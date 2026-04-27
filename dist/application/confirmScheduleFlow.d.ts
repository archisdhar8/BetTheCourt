import type { ApplicationDeps, ConfirmScheduleFlowInput } from "./model.js";
/**
 * Confirms a slot via `SchedulingService` (which already requires `funded` + venue).
 * When the challenge becomes `scheduled`, emits `schedule_confirmed` to both parties.
 */
export declare function confirmScheduleFlow(deps: ApplicationDeps, input: ConfirmScheduleFlowInput): Promise<{
    scheduleView: import("../scheduling/model.js").ScheduleView;
    challenge: import("../challenges/model.js").Challenge;
}>;
//# sourceMappingURL=confirmScheduleFlow.d.ts.map