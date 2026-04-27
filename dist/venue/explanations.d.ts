import type { ParticipantInput, RankedVenue, VenueRecord } from "./model.js";
export declare function buildDeterministicVenueExplanation(input: {
    venue: VenueRecord;
    participants: ParticipantInput[];
    ranked: RankedVenue;
}): string;
export declare function withVenueAiExplanation(row: RankedVenue, provider: (prompt: string) => Promise<string>): Promise<string>;
//# sourceMappingURL=explanations.d.ts.map