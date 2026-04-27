import { z } from "zod";
import { actorSchema } from "../challenges/contract.js";

export const submitCheckinBodySchema = z.object({
  actor: actorSchema,
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});
