import { createVenueAiExplanationHook } from "../aiExplanation.js";
import { venueDiscoveryRequestSchema } from "../contract.js";
import { rankVenues } from "../service.js";
export function registerVenueRoutes(app) {
    app.post("/v1/venue-discovery/rank", async (req, reply) => {
        const parsed = venueDiscoveryRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "invalid_request",
                details: parsed.error.flatten(),
            });
        }
        const body = parsed.data;
        const now = body.now ? new Date(body.now) : undefined;
        const useAi = Boolean(body.options?.useAiExplanations) && Boolean(process.env.OPENAI_API_KEY);
        const result = await rankVenues({
            sport: body.sport,
            participants: body.participants,
            venues: body.venues,
            preferences: body.preferences,
            now,
            config: body.config,
            explanationHook: createVenueAiExplanationHook(useAi),
        });
        return reply.send(result);
    });
}
//# sourceMappingURL=register.js.map