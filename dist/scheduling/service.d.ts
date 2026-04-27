import type { Actor } from "../challenges/model.js";
import type { ChallengeService } from "../challenges/service.js";
import { type ScheduleView } from "./model.js";
import type { SchedulingRepository } from "./repository.js";
/** Great-circle distance in km (deterministic; optional travel awareness). */
export declare function haversineKm(a: {
    lat: number;
    lng: number;
}, b: {
    lat: number;
    lng: number;
}): number;
export declare class SchedulingService {
    private readonly repo;
    private readonly challenges;
    constructor(repo: SchedulingRepository, challenges: ChallengeService);
    getScheduleView(challengeId: string): Promise<ScheduleView>;
    proposeSlots(input: {
        challengeId: string;
        actor: Actor;
        slots: {
            id?: string;
            startAt: string;
            endAt: string;
            note?: string;
        }[];
        expiresAt: string;
        travelBufferMinutes?: number;
        venue?: {
            lat: number;
            lng: number;
        };
        creatorLocation?: {
            lat: number;
            lng: number;
        };
        opponentLocation?: {
            lat: number;
            lng: number;
        };
    }): Promise<ScheduleView>;
    /** Counter-propose uses the same payload shape as `proposeSlots`. */
    counterProposeSlots(input: Parameters<SchedulingService["proposeSlots"]>[0]): Promise<ScheduleView>;
    confirmSlot(input: {
        challengeId: string;
        actor: Actor;
        slotId: string;
    }): Promise<ScheduleView>;
    cancelPendingProposal(input: {
        challengeId: string;
        actor: Actor;
    }): Promise<ScheduleView>;
    /**
     * Marks pending proposals expired when `expiresAt` is before `asOf` (defaults to now).
     * Intended for cron / system calls; exposed as HTTP for MVP.
     */
    expireStaleProposals(input: {
        challengeId: string;
        asOf?: string;
    }): Promise<ScheduleView>;
    private requireSession;
}
//# sourceMappingURL=service.d.ts.map