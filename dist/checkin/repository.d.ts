import type { CheckInBundle } from "./model.js";
export interface CheckinRepository {
    loadBundle(challengeId: string): Promise<CheckInBundle | null>;
    saveBundle(bundle: CheckInBundle): Promise<void>;
}
export declare class InMemoryCheckinRepository implements CheckinRepository {
    private readonly store;
    loadBundle(challengeId: string): Promise<CheckInBundle | null>;
    saveBundle(bundle: CheckInBundle): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=repository.d.ts.map