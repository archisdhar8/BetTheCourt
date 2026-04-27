import type { FastifyInstance, FastifyReply } from "fastify";
import { WalletDomainError } from "../model.js";
import type { WalletService } from "../service.js";
import {
  createWalletBodySchema,
  creditWalletBodySchema,
  debitWalletBodySchema,
  lockEscrowBodySchema,
  payoutEscrowBodySchema,
  refundEscrowBodySchema,
} from "../contract.js";

function domainErrorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof WalletDomainError) {
    return reply.status(err.httpStatus).send({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  throw err;
}

export function registerWalletRoutes(app: FastifyInstance, wallet: WalletService): void {
  app.post("/v1/wallets", async (req, reply) => {
    const parsed = createWalletBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      const w = await wallet.createWallet(parsed.data);
      return reply.status(201).send(w);
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.get("/v1/wallets/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    try {
      return reply.send(await wallet.getWalletBalances(userId));
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/wallets/:userId/credit", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const parsed = creditWalletBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await wallet.creditWallet({
          userId,
          amountMinor: parsed.data.amountMinor,
          currency: parsed.data.currency,
          idempotencyKey: parsed.data.idempotencyKey,
          metadata: parsed.data.metadata,
        }),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/wallets/:userId/debit", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const parsed = debitWalletBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await wallet.debitWallet({
          userId,
          amountMinor: parsed.data.amountMinor,
          currency: parsed.data.currency,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/escrow/lock", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = lockEscrowBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await wallet.lockChallengeStake({
          challengeId: id,
          userId: parsed.data.userId,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/escrow/refund", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = refundEscrowBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await wallet.refundChallengeEscrow({
          challengeId: id,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });

  app.post("/v1/challenges/:id/escrow/payout", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = payoutEscrowBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await wallet.payoutChallengeEscrow({
          challengeId: id,
          winnerUserId: parsed.data.winnerUserId,
          platformFeeMinor: parsed.data.platformFeeMinor,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
      );
    } catch (err) {
      return domainErrorReply(reply, err);
    }
  });
}
