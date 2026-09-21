import { env } from "./config/env.ts";
import { runMigrations } from "./services/db/migrate.ts";
import { startTurnWorkers } from "./services/queue/turnWorker.ts";
import { createTelegramBot, startReceiving } from "./services/telegram-bot/index.ts";

await runMigrations();

const isReceiver = env.role === "all" || env.role === "receiver";
const isWorker = env.role === "all" || env.role === "worker";

const bot = createTelegramBot(isReceiver);

if (isReceiver) {
    startReceiving(bot);
}
if (isWorker) {
    startTurnWorkers(bot);
}

console.log(`Started with ROLE=${env.role} (receiving: ${isReceiver}, working: ${isWorker})`);
