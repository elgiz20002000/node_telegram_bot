import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { transcriptionAudio } from "../../../open-ai-api/index.ts";
import { downloadToTempDir } from "../../downloadToTempDir.ts";
import type { TurnInput } from "../../../turn/types.ts";

export async function normalizeVoice(bot: TelegramBot, msg: Message): Promise<TurnInput> {
    const fileId = msg.voice!.file_id;
    const { localPath, cleanup } = await downloadToTempDir(bot, fileId);
    try {
        const transcription = await transcriptionAudio(localPath);
        const text = [transcription.text, msg.caption?.trim()].filter(Boolean).join("\n\n");
        return {
            chatId: msg.chat.id,
            threadId: msg.message_thread_id ?? 0,
            telegramMessageId: msg.message_id,
            telegramUserId: msg.from?.id,
            chatType: msg.chat.type,
            sourceKind: "voice",
            transcriptText: text,
            promptText: text,
        };
    } finally {
        await cleanup();
    }
}
