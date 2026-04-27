import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { ChallengeService } from "../challenges/service.js";
import { InMemoryChallengeRepository } from "../challenges/repository.js";
import { registerChallengeRoutes } from "../challenges/http/register.js";
import { registerMatchmakingRoutes } from "../matchmaking/http/register.js";
import { registerVenueRoutes } from "../venue/http/register.js";
import { InMemoryWalletRepository } from "../wallet/repository.js";
import { WalletService } from "../wallet/service.js";
import { registerWalletRoutes } from "../wallet/http/register.js";
import { InMemorySchedulingRepository } from "../scheduling/repository.js";
import { SchedulingService } from "../scheduling/service.js";
import { registerSchedulingRoutes } from "../scheduling/http/register.js";
import { InMemoryResultsRepository } from "../results/repository.js";
import { ResultsService } from "../results/service.js";
import { registerResultsRoutes } from "../results/http/register.js";
import { InMemoryCheckinRepository } from "../checkin/repository.js";
import { CheckinService } from "../checkin/service.js";
import { InMemoryVenueLocationProvider } from "../checkin/venueProvider.js";
import { registerCheckinRoutes } from "../checkin/http/register.js";
import { InMemoryFraudRepository } from "../fraud/repository.js";
import { FraudService } from "../fraud/service.js";
import { registerFraudRoutes } from "../fraud/http/register.js";
import { InMemoryRankingRepository } from "../ranking/repository.js";
import { RankingService } from "../ranking/service.js";
import { registerRankingRoutes } from "../ranking/http/register.js";
import { InMemoryNotificationsRepository } from "../notifications/repository.js";
import { NotificationService } from "../notifications/service.js";
import { registerNotificationRoutes } from "../notifications/http/register.js";
export function buildApiServer() {
    const app = Fastify({ logger: true });
    app.register(cors, { origin: true });
    app.get("/health", async () => ({
        ok: true,
        services: [
            "matchmaking",
            "venue-discovery",
            "challenges",
            "wallet",
            "scheduling",
            "results",
            "checkin",
            "fraud",
            "ranking",
            "notifications",
        ],
    }));
    const challengeRepo = new InMemoryChallengeRepository();
    const challenges = new ChallengeService(challengeRepo);
    const resultsRepo = new InMemoryResultsRepository();
    const results = new ResultsService(resultsRepo, challenges);
    const venueLocations = new InMemoryVenueLocationProvider();
    const checkinRepo = new InMemoryCheckinRepository();
    const checkin = new CheckinService(checkinRepo, challenges, venueLocations);
    const fraudRepo = new InMemoryFraudRepository();
    const fraud = new FraudService(fraudRepo, challenges, checkin);
    const rankingRepo = new InMemoryRankingRepository();
    const ranking = new RankingService(rankingRepo, challenges, fraud);
    const walletRepo = new InMemoryWalletRepository();
    const wallet = new WalletService(walletRepo, challenges, fraud);
    const schedulingRepo = new InMemorySchedulingRepository();
    const scheduling = new SchedulingService(schedulingRepo, challenges);
    const notificationsRepo = new InMemoryNotificationsRepository();
    const notifications = new NotificationService(notificationsRepo);
    registerMatchmakingRoutes(app);
    registerVenueRoutes(app);
    registerChallengeRoutes(app, challenges);
    registerSchedulingRoutes(app, scheduling);
    registerResultsRoutes(app, results);
    registerCheckinRoutes(app, checkin);
    registerFraudRoutes(app, fraud);
    registerRankingRoutes(app, ranking);
    registerNotificationRoutes(app, notifications);
    registerWalletRoutes(app, wallet);
    return app;
}
async function main() {
    const app = buildApiServer();
    const port = Number(process.env.PORT ?? "3000");
    const host = process.env.HOST ?? "0.0.0.0";
    await app.listen({ port, host });
}
const entryPath = path.resolve(fileURLToPath(import.meta.url));
const argvPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isMain = argvPath === entryPath;
if (isMain) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map