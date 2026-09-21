import type TelegramBot from "node-telegram-bot-api";
import { withAssistantTurn } from "./withAssistantTurn.ts";

export function registerPhotoHandler(bot: TelegramBot): void {
    bot.on("photo", async (msg) => {
        if (!msg.photo?.length) return;
        await withAssistantTurn(bot, msg, "photo");
    });
}
