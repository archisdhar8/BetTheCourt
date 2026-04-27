import type { RankedVenue } from "./model.js";
export declare function openAiRewriteVenuePrompt(prompt: string): Promise<string>;
export declare function createVenueAiExplanationHook(enabled: boolean): undefined | ((row: RankedVenue) => Promise<string>);
//# sourceMappingURL=aiExplanation.d.ts.map