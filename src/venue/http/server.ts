import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerVenueRoutes } from "./register.js";

export function buildVenueDiscoveryServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "venue-discovery" }));

  registerVenueRoutes(app);

  return app;
}

async function main() {
  const app = buildVenueDiscoveryServer();
  const port = Number(process.env.PORT ?? "3001");
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
