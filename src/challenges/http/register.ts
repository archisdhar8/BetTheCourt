import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  acceptBodySchema,
  actorSchema,
  cancelBodySchema,
  createChallengeBodySchema,
  declineBodySchema,
  patchVenueBodySchema,
  payoutBodySchema,
  resolveDisputeBodySchema,
} from "../contract.js";
import { ChallengeDomainError } from "../model.js";
import type { ChallengeService } from "../service.js";

const submitBodySchema = z.object({ actor: actorSchema });

function domainErrorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof ChallengeDomainError) {
    return reply.status(err.httpStatus).send({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  throw err;
}

export function registerChallengeRoutes(app: FastifyInstance, challenges: ChallengeService): void {
  app.get("/v1/challenges", async (_req, reply) => {
    try {
      return reply.send(await challenges.listChallenges());
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges", async (req, reply) => {
    const parsed = createChallengeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    const b = parsed.data;
    try {
      const ch = await challenges.createChallenge({
        sport: b.sport,
        mode: b.mode,
        creatorPartyId: b.creatorPartyId,
        opponentPartyId: b.opponentPartyId,
        stakeMinor: b.stakeMinor,
        currency: b.currency,
        initialState: b.initialState,
      });
      return reply.status(201).send(ch);
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.get("/v1/challenges/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return reply.send(await challenges.getChallenge(id));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/submit", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = submitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.submitDraft(id, parsed.data.actor));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/accept", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = acceptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.accept(id, parsed.data.actor));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/decline", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = declineBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.decline(id, parsed.data.actor));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = cancelBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.cancel(id, parsed.data.actor, parsed.data.reason));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.patch("/v1/challenges/:id/venue", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = patchVenueBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.patchVenue(id, parsed.data.actor, parsed.data.venueId));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/resolve-dispute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = resolveDisputeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await challenges.resolveDispute(id, parsed.data.actor, parsed.data.resolution, parsed.data.note),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/payout", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = payoutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await challenges.finalizePayout(id, parsed.data.actor));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });
}
