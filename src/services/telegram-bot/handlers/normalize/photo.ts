import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { attachUploadedFile } from "../../../open-ai-api/index.ts";
import { buildPromptWithOptionalFilename } from "../../../open-ai-api/helpers/buildPromptWithOptionalFilename.ts";
import { downloadToTempDir } from "../../downloadToTempDir.ts";
import type { TurnInput } from "../../../turn/types.ts";

export async function normalizePhoto(bot: TelegramBot, msg: Message): Promise<TurnInput> {
    const photos = msg.photo!;
    const largest = photos[photos.length - 1]!;
    const { localPath, cleanup } = await downloadToTempDir(bot, largest.file_id);
    try {
        const attachment = await attachUploadedFile(localPath, (fileId) => ({
            type: "input_image",
            detail: "auto",
            file_id: fileId,
        }));

        const promptText = buildPromptWithOptionalFilename("image", { userPrompt: msg.caption?.trim() });
        const transcriptText = [msg.caption?.trim(), "[attached image]"].filter(Boolean).join("\n\n");

        return {
            chatId: msg.chat.id,
            threadId: msg.message_thread_id ?? 0,
            telegramMessageId: msg.message_id,
            telegramUserId: msg.from?.id,
            chatType: msg.chat.type,
            sourceKind: "photo",
            transcriptText,
            promptText,
            attachments: [attachment],
            mediaMeta: { fileId: largest.file_id },
        };
    } finally {
        await cleanup();
    }
}
