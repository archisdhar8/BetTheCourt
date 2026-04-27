import type { CheckInBundle } from "./model.js";

export interface CheckinRepository {
  loadBundle(challengeId: string): Promise<CheckInBundle | null>;
  saveBundle(bundle: CheckInBundle): Promise<void>;
}

export class InMemoryCheckinRepository implements CheckinRepository {
  private readonly store = new Map<string, CheckInBundle>();

  async loadBundle(challengeId: string): Promise<CheckInBundle | null> {
    return this.store.get(challengeId) ?? null;
  }

  async saveBundle(bundle: CheckInBundle): Promise<void> {
    this.store.set(bundle.challengeId, bundle);
  }

  clear(): void {
    this.store.clear();
  }
}
