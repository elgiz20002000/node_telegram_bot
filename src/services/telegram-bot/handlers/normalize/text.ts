import type { Message } from "node-telegram-bot-api";
import type { TurnInput } from "../../../turn/types.ts";

export function normalizeText(msg: Message): TurnInput {
    const text = msg.text ?? "";
    return {
        chatId: msg.chat.id,
        threadId: msg.message_thread_id ?? 0,
        telegramMessageId: msg.message_id,
        telegramUserId: msg.from?.id,
        chatType: msg.chat.type,
        sourceKind: "text",
        transcriptText: text,
        promptText: text,
    };
}
