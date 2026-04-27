import type { FastifyInstance, FastifyReply } from "fastify";
import { NotificationDomainError } from "../model.js";
import type { NotificationService } from "../service.js";
import { listNotificationsQuerySchema } from "../contract.js";

function notificationErrorReply(reply: FastifyReply, err: unknown) {
  if (err instanceof NotificationDomainError) {
    return reply.status(err.httpStatus).send({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  throw err;
}

export function registerNotificationRoutes(app: FastifyInstance, notifications: NotificationService): void {
  app.get("/v1/users/:userId/notifications", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const parsed = listNotificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    try {
      return reply.send(
        await notifications.listNotifications(userId, {
          unreadOnly: parsed.data.unreadOnly,
        }),
      );
    } catch (err) {
      return notificationErrorReply(reply, err);
    }
  });

  app.post("/v1/users/:userId/notifications/:notificationId/read", async (req, reply) => {
    const { userId, notificationId } = req.params as { userId: string; notificationId: string };
    try {
      return reply.send(await notifications.markRead(userId, notificationId));
    } catch (err) {
      return notificationErrorReply(reply, err);
    }
  });

  app.post("/v1/users/:userId/notifications/read-all", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    try {
      return reply.send(await notifications.markAllRead(userId));
    } catch (err) {
      return notificationErrorReply(reply, err);
    }
  });
}
