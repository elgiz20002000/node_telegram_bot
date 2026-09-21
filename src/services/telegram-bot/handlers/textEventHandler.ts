import type TelegramBot from "node-telegram-bot-api";
import { handleHelp, handleReset } from "./commandsHandler.ts";
import { withAssistantTurn } from "./withAssistantTurn.ts";

export function registerTextHandler(bot: TelegramBot): void {
    bot.onText(/^\/reset$/, async (msg) => {
        if (msg.chat.type !== "private") return;
        await handleReset(bot, msg);
    });

    bot.onText(/^\/help$/, async (msg) => {
        if (msg.chat.type !== "private") return;
        await handleHelp(bot, msg);
    });

    bot.on("text", async (msg) => {
        if (!msg.text || msg.text.startsWith("/")) return;
        await withAssistantTurn(bot, msg, "text");
    });
}
