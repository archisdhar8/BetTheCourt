import type { Actor } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import { type CheckInPolicy, type CheckInStatusView } from "./model.js";
import type { CheckinRepository } from "./repository.js";
import type { VenueLocationProvider } from "./venueProvider.js";
export declare class CheckinService {
    private readonly repo;
    private readonly challenges;
    private readonly venues;
    private readonly policy;
    private readonly clock;
    constructor(repo: CheckinRepository, challenges: ChallengeService, venues: VenueLocationProvider, policyOverrides?: Partial<CheckInPolicy>, clock?: () => number);
    /** For `ResultsService` / payout confidence: both participants have a **valid** check-in on file. */
    bothPartiesHaveValidCheckin(challengeId: string): Promise<boolean>;
    partyHasValidCheckin(challengeId: string, partyId: string): Promise<boolean>;
    getCheckInStatus(challengeId: string): Promise<CheckInStatusView>;
    submitCheckIn(input: {
        challengeId: string;
        actor: Actor;
        lat: number;
        lng: number;
    }): Promise<CheckInStatusView>;
}
//# sourceMappingURL=service.d.ts.map