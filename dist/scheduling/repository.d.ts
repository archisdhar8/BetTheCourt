import type { ScheduleSession } from "./model.js";
/**
 * Persistence port for per-challenge schedule sessions.
 * Postgres: table `schedule_sessions` keyed by `challenge_id` with JSONB payload.
 */
export interface SchedulingRepository {
    loadSession(challengeId: string): Promise<ScheduleSession | null>;
    saveSession(session: ScheduleSession): Promise<void>;
}
export declare class InMemorySchedulingRepository implements SchedulingRepository {
    private readonly store;
    loadSession(challengeId: string): Promise<ScheduleSession | null>;
    saveSession(session: ScheduleSession): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map