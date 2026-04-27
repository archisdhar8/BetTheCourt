import type { RankedOpponent } from "./model.js";
import { withAiExplanation } from "./explanations.js";

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function openAiRewritePrompt(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return prompt;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You rewrite matchmaking rationales to be concise (<=3 sentences), friendly, and faithful to the facts given. Do not add new statistics.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    return prompt;
  }

  const json = (await res.json()) as ChatCompletionsResponse;
  const text = json.choices?.[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : prompt;
}

export function createAiExplanationHook(enabled: boolean): undefined | ((row: RankedOpponent) => Promise<string>) {
  if (!enabled) return undefined;
  return async (row) => {
    if (!process.env.OPENAI_API_KEY) return row.explanation;
    return withAiExplanation(row, openAiRewritePrompt);
  };
}
