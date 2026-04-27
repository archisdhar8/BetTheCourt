import { z } from "zod";
import { actorSchema } from "../challenges/contract.js";
const withActor = (shape) => z.object({ ...shape, actor: actorSchema });
export const timeSlotInputSchema = z.object({
    id: z.string().min(1).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    note: z.string().max(500).optional(),
});
export const geoPointSchema = z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
});
export const proposeScheduleSlotsBodySchema = withActor({
    slots: z.array(timeSlotInputSchema).min(1).max(32),
    expiresAt: z.string().datetime(),
    travelBufferMinutes: z.number().int().nonnegative().max(24 * 60).optional(),
    venue: geoPointSchema.optional(),
    creatorLocation: geoPointSchema.optional(),
    opponentLocation: geoPointSchema.optional(),
});
export const confirmScheduleSlotBodySchema = withActor({
    slotId: z.string().min(1).max(128),
});
export const cancelScheduleProposalBodySchema = withActor({});
export const expireScheduleBodySchema = z.object({
    asOf: z.string().datetime().optional(),
});
//# sourceMappingURL=contract.js.map