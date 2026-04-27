import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerMatchmakingRoutes } from "./register.js";

export function buildMatchmakingServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "matchmaking" }));

  registerMatchmakingRoutes(app);

  return app;
}

async function main() {
  const app = buildMatchmakingServer();
  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}

const isMain = process.argv[1]?.includes("server");
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
