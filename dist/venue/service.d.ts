import type { ParticipantInput, PartialVenueDiscoveryConfig, RankedVenue, SportCode, VenueDiscoveryConfig, VenueDiscoveryPreferences, VenueDiscoveryResult, VenueRecord } from "./model.js";
export declare const DEFAULT_VENUE_DISCOVERY_CONFIG: VenueDiscoveryConfig;
export type RankVenuesInput = {
    sport: SportCode;
    participants: ParticipantInput[];
    venues: VenueRecord[];
    preferences: VenueDiscoveryPreferences;
    now?: Date;
    config?: PartialVenueDiscoveryConfig;
    explanationHook?: (row: RankedVenue) => Promise<string>;
};
export declare function rankVenues(input: RankVenuesInput): Promise<VenueDiscoveryResult>;
//# sourceMappingURL=service.d.ts.map