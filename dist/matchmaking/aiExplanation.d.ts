import type { RankedOpponent } from "./model.js";
export declare function openAiRewritePrompt(prompt: string): Promise<string>;
export declare function createAiExplanationHook(enabled: boolean): undefined | ((row: RankedOpponent) => Promise<string>);
//# sourceMappingURL=aiExplanation.d.ts.map