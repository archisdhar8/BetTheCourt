import type { FastifyInstance, FastifyReply } from "fastify";
import { ChallengeDomainError } from "../../challenges/model.js";
import { RankingDomainError } from "../model.js";
import type { RankingService } from "../service.js";
import { applyRankingBodySchema, leaderboardQuerySchema } from "../contract.js";

function rankingErrorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof RankingDomainError) {
    return reply.status(err.httpStatus).send({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  if (err instanceof ChallengeDomainError) {
    return reply.status(err.httpStatus).send({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  throw err;
}

export function registerRankingRoutes(app: FastifyInstance, ranking: RankingService): void {
  app.get("/v1/leaderboards/:sport", async (req, reply) => {
    const { sport } = req.params as { sport: string };
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send({
        sport,
        window: parsed.data.window,
        entries: await ranking.getLeaderboard(sport, parsed.data.window),
      });
    } catch (err) {
      return rankingErrorReply(reply, err);
    }
  });

  app.get("/v1/users/:userId/ranking/:sport", async (req, reply) => {
    const { userId, sport } = req.params as { userId: string; sport: string };
    try {
      return reply.send(await ranking.getUserRankingView(userId, sport));
    } catch (err) {
      return rankingErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/ranking/apply", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = applyRankingBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await ranking.applyRankingFromConfirmedChallenge(id));
    } catch (err) {
      return rankingErrorReply(reply, err);
    }
  });
}
