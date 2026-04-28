import type { FastifyInstance, FastifyReply } from "fastify";
import { UserDomainError } from "../model.js";
import { updateLocationSchema } from "../contract.js";
import type { UsersService } from "../service.js";

function errorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof UserDomainError) {
    return reply.status(err.httpStatus).send({ error: err.code, message: err.message });
  }
  throw err;
}

export function registerUserRoutes(app: FastifyInstance, users: UsersService): void {
  app.get("/v1/users", async (_req, reply) => {
    try {
      return reply.send({ users: await users.listPublicProfiles() });
    } catch (err) {
      return errorReply(reply, err);
    }
  });

  app.get("/v1/users/:userId/profile", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    try {
      return reply.send({ user: await users.getPublicProfile(userId) });
    } catch (err) {
      return errorReply(reply, err);
    }
  });

  app.patch("/v1/users/:userId/location", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send({ user: await users.updateLocation({ userId, ...parsed.data }) });
    } catch (err) {
      return errorReply(reply, err);
    }
  });
}
