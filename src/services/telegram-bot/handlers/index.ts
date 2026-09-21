import type TelegramBot from "node-telegram-bot-api";
import { registerDocumentHandler } from "./documentEventHandler.ts";
import { registerPhotoHandler } from "./photoEventHandler.ts";
import { registerTextHandler } from "./textEventHandler.ts";
import { registerVoiceHandler } from "./voiceEventHandler.ts";

export function registerTelegramEventHandlers(bot: TelegramBot): void {
    registerTextHandler(bot);
    registerVoiceHandler(bot);
    registerDocumentHandler(bot);
    registerPhotoHandler(bot);
}
