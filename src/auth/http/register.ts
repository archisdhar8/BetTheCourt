import type { FastifyInstance, FastifyReply } from "fastify";
import { AuthDomainError } from "../model.js";
import type { AuthService } from "../service.js";
import { loginSchema, registerSchema } from "../contract.js";

function errorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof AuthDomainError) {
    return reply.status(err.httpStatus).send({ error: err.code, message: err.message });
  }
  throw err;
}

function bearerToken(headerValue: string | undefined): string | undefined {
  if (!headerValue?.startsWith("Bearer ")) return undefined;
  return headerValue.slice("Bearer ".length).trim();
}

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService): void {
  app.post("/v1/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await auth.register(parsed.data));
    } catch (err) {
      return errorReply(reply, err);
    }
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await auth.login(parsed.data));
    } catch (err) {
      return errorReply(reply, err);
    }
  });

  app.get("/v1/auth/me", async (req, reply) => {
    try {
      return reply.send({ user: await auth.me(bearerToken(req.headers.authorization)) });
    } catch (err) {
      return errorReply(reply, err);
    }
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    try {
      await auth.logout(bearerToken(req.headers.authorization));
      return reply.send({ ok: true });
    } catch (err) {
      return errorReply(reply, err);
    }
  });
}
