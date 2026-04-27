import { z } from "zod";

export const leaderboardQuerySchema = z.object({
  window: z.enum(["all_time", "weekly"]).optional().default("all_time"),
});

export const applyRankingBodySchema = z.object({}).optional();
