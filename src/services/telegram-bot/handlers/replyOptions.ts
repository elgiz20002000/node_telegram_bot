import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";

/** Plain status line shown while the assistant is working (no Markdown). */
export const ASSISTANT_WORKING_STATUS_MESSAGE = "⏳ One moment…";

/** User-visible error when assistant processing fails. */
export const ASSISTANT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Thread / forum topic only (plain text status or errors). */
export function threadOnlyOptions(msg: Message): TelegramBot.SendMessageOptions {
    return {
        message_thread_id: msg.message_thread_id,
    };
}

/** Common options for assistant replies (topics only — parse_mode is chosen by sendChunkedReply). */
export function assistantReplyOptions(msg: Message): TelegramBot.SendMessageOptions {
    return {
        message_thread_id: msg.message_thread_id,
    };
}
