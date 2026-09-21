import type TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import type { SourceKind } from "../../conversation/types.ts";
import { enqueueTurn } from "../../queue/turnQueue.ts";
import { ASSISTANT_ERROR_MESSAGE, ASSISTANT_WORKING_STATUS_MESSAGE, threadOnlyOptions } from "./replyOptions.ts";

/**
 * The receiver-side flow shared by every input type: private chats only,
 * a status message while the job waits its turn, then hand off to the
 * queue and return. The actual download/model call happens later, in
 * whichever worker owns this chat's shard (see turnWorker.ts) — this is
 * what lets a Telegram update be acknowledged in milliseconds instead of
 * however long the model call takes.
 */
export async function withAssistantTurn(bot: TelegramBot, msg: Message, kind: SourceKind): Promise<void> {
    if (msg.chat.type !== "private") return;

    const ctx = threadOnlyOptions(msg);
    const status = await bot.sendMessage(msg.chat.id, ASSISTANT_WORKING_STATUS_MESSAGE, ctx);
    try {
        await enqueueTurn({ kind, msg, statusMessageId: status.message_id });
    } catch (error) {
        console.error(error);
        await bot.sendMessage(msg.chat.id, ASSISTANT_ERROR_MESSAGE, ctx).catch(() => undefined);
        await bot.deleteMessage(msg.chat.id, status.message_id).catch(() => undefined);
    }
}
