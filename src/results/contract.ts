import { z } from "zod";
import { actorSchema } from "../challenges/contract.js";

const withActor = <T extends z.ZodRawShape>(shape: T) => z.object({ ...shape, actor: actorSchema });

export const submitResultBodySchema = withActor({
  payload: z.record(z.string(), z.unknown()),
});

export const confirmResultBodySchema = withActor({
  note: z.string().max(500).optional(),
  ackFingerprint: z.string().min(1).max(512).optional(),
});

export const disputeResultBodySchema = withActor({
  reason: z.string().min(1).max(2000),
  counterPayload: z.record(z.string(), z.unknown()).optional(),
});
