import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { pool } from "../../db/pool.ts";
import { threadOnlyOptions } from "./replyOptions.ts";

const HELP_TEXT = [
    "I'm a conversational assistant — just message me normally, and I'll remember our conversation.",
    "",
    "Commands:",
    "/reset — start a fresh conversation (earlier messages are kept but no longer used as context)",
    "/help — show this message",
].join("\n");

/**
 * Bumps the /reset watermark to the latest message instead of deleting
 * history — nothing after this point counts as context anymore, but it
 * stays in Postgres for the eventual retention job.
 */
export async function handleReset(bot: TelegramBot, msg: Message): Promise<void> {
    await pool.query(
        `UPDATE conversations
         SET active_from_message_id = (SELECT COALESCE(MAX(id), 0) FROM messages WHERE conversation_id = conversations.id),
             summary_text = NULL,
             summary_through_id = 0,
             summary_tokens = 0
         WHERE chat_id = $1 AND thread_id = $2`,
        [msg.chat.id, msg.message_thread_id ?? 0],
    );
    await bot.sendMessage(
        msg.chat.id,
        "Started a fresh conversation. Earlier messages are kept but won't be used as context anymore.",
        threadOnlyOptions(msg),
    );
}

export async function handleHelp(bot: TelegramBot, msg: Message): Promise<void> {
    await bot.sendMessage(msg.chat.id, HELP_TEXT, threadOnlyOptions(msg));
}
