import type { ScheduleSession } from "./model.js";

/**
 * Persistence port for per-challenge schedule sessions.
 * Postgres: table `schedule_sessions` keyed by `challenge_id` with JSONB payload.
 */
export interface SchedulingRepository {
  loadSession(challengeId: string): Promise<ScheduleSession | null>;
  saveSession(session: ScheduleSession): Promise<void>;
}

export class InMemorySchedulingRepository implements SchedulingRepository {
  private readonly store = new Map<string, ScheduleSession>();

  async loadSession(challengeId: string): Promise<ScheduleSession | null> {
    return this.store.get(challengeId) ?? null;
  }

  async saveSession(session: ScheduleSession): Promise<void> {
    this.store.set(session.challengeId, session);
  }

  clear(): void {
    this.store.clear();
  }
}
