import type TelegramBot from "node-telegram-bot-api";
import { withAssistantTurn } from "./withAssistantTurn.ts";

export function registerDocumentHandler(bot: TelegramBot): void {
    bot.on("document", async (msg) => {
        if (!msg.document) return;
        await withAssistantTurn(bot, msg, "document");
    });
}
