import type TelegramBot from "node-telegram-bot-api";
import { withAssistantTurn } from "./withAssistantTurn.ts";

export function registerVoiceHandler(bot: TelegramBot): void {
    bot.on("voice", async (msg) => {
        if (!msg.voice) return;
        await withAssistantTurn(bot, msg, "voice");
    });
}
