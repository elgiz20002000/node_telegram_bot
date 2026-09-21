import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { attachUploadedFile } from "../../../open-ai-api/index.ts";
import { buildPromptWithOptionalFilename } from "../../../open-ai-api/helpers/buildPromptWithOptionalFilename.ts";
import { downloadToTempDir } from "../../downloadToTempDir.ts";
import type { TurnInput } from "../../../turn/types.ts";

export async function normalizeDocument(bot: TelegramBot, msg: Message): Promise<TurnInput> {
    const doc = msg.document!;
    const { localPath, cleanup } = await downloadToTempDir(bot, doc.file_id);
    try {
        const attachment = await attachUploadedFile(localPath, (fileId) => ({
            type: "input_file",
            file_id: fileId,
        }));

        const promptText = buildPromptWithOptionalFilename("document", {
            userPrompt: msg.caption?.trim(),
            filename: doc.file_name,
        });
        const transcriptText = [msg.caption?.trim(), `[attached document: ${doc.file_name ?? "unnamed file"}]`]
            .filter(Boolean)
            .join("\n\n");

        return {
            chatId: msg.chat.id,
            threadId: msg.message_thread_id ?? 0,
            telegramMessageId: msg.message_id,
            telegramUserId: msg.from?.id,
            chatType: msg.chat.type,
            sourceKind: "document",
            transcriptText,
            promptText,
            attachments: [attachment],
            mediaMeta: { fileId: doc.file_id, fileName: doc.file_name ?? null, mimeType: doc.mime_type ?? null },
        };
    } finally {
        await cleanup();
    }
}
