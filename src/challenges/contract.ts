import { z } from "zod";

export const actorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("party"), partyId: z.string().min(1) }),
  z.object({ kind: z.literal("system") }),
  z.object({ kind: z.literal("admin"), adminId: z.string().min(1) }),
]);

export const createChallengeBodySchema = z.object({
  sport: z.string().min(1).max(64),
  mode: z.enum(["1v1", "team"]),
  creatorPartyId: z.string().min(1),
  opponentPartyId: z.string().min(1),
  stakeMinor: z.number().int().nonnegative(),
  currency: z.string().min(3).max(8),
  /** `pending` (default) auto-applies draft→submit; `draft` keeps the challenge editable until submit via API (future) or internal tooling. */
  initialState: z.enum(["draft", "pending"]).optional().default("pending"),
});

export const withActor = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ ...shape, actor: actorSchema });

export const acceptBodySchema = withActor({});
export const declineBodySchema = withActor({});
export const cancelBodySchema = withActor({
  reason: z.string().max(500).optional(),
});

export const patchVenueBodySchema = withActor({
  venueId: z.string().min(1),
});

export const resolveDisputeBodySchema = withActor({
  resolution: z.enum(["confirm", "refund"]),
  note: z.string().max(500).optional(),
});

export const payoutBodySchema = withActor({});
