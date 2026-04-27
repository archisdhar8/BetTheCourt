import { matchmakingRequestSchema } from "../contract.js";
import { createAiExplanationHook } from "../aiExplanation.js";
import { recommendMatches } from "../service.js";
export function registerMatchmakingRoutes(app) {
    app.post("/v1/matchmaking/recommend", async (req, reply) => {
        const parsed = matchmakingRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "invalid_request",
                details: parsed.error.flatten(),
            });
        }
        const body = parsed.data;
        const now = body.now ? new Date(body.now) : undefined;
        const useAi = Boolean(body.options?.useAiExplanations) && Boolean(process.env.OPENAI_API_KEY);
        const result = await recommendMatches({
            seeker: body.seeker,
            candidates: body.candidates,
            now,
            config: body.config,
            explanationHook: createAiExplanationHook(useAi),
        });
        return reply.send(result);
    });
}
//# sourceMappingURL=register.js.map