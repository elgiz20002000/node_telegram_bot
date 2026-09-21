import TelegramBot from "node-telegram-bot-api";
import { env } from "../../config/env.ts";
import { registerTelegramEventHandlers } from "./handlers/index.ts";

/**
 * Only ever run with `polling: true` from a single instance — Telegram
 * allows exactly one `getUpdates` consumer per bot token; a second polling
 * instance gets HTTP 409 and both flap. A worker-only instance passes
 * `false` here: it still needs a bot client to send replies and download
 * files, just not one that listens for incoming updates.
 */
export function createTelegramBot(polling: boolean): TelegramBot {
    return new TelegramBot(env.telegramBotToken, { polling });
}

export function startReceiving(bot: TelegramBot): void {
    registerTelegramEventHandlers(bot);
}
