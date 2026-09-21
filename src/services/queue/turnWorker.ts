import { Worker } from "bullmq";
import type TelegramBot from "node-telegram-bot-api";
import { env } from "../../config/env.ts";
import type { TurnInput } from "../turn/types.ts";
import { runTurn } from "../turn/runTurn.ts";
import { normalizeDocument } from "../telegram-bot/handlers/normalize/document.ts";
import { normalizePhoto } from "../telegram-bot/handlers/normalize/photo.ts";
import { normalizeText } from "../telegram-bot/handlers/normalize/text.ts";
import { normalizeVoice } from "../telegram-bot/handlers/normalize/voice.ts";
import { ASSISTANT_ERROR_MESSAGE, assistantReplyOptions, threadOnlyOptions } from "../telegram-bot/handlers/replyOptions.ts";
import { sendChunkedReply } from "../telegram-bot/sendChunkedReply.ts";
import { redisConnection } from "./redisConnection.ts";
import { turnQueueName, type TurnJobData } from "./turnQueue.ts";

/** The download/upload/transcribe work the receiver deliberately skips, done here instead. */
async function normalize(bot: TelegramBot, data: TurnJobData): Promise<TurnInput> {
    switch (data.kind) {
        case "text":
            return normalizeText(data.msg);
        case "voice":
            return normalizeVoice(bot, data.msg);
        case "document":
            return normalizeDocument(bot, data.msg);
        case "photo":
            return normalizePhoto(bot, data.msg);
        default:
            throw new Error(`Unknown turn kind: ${data.kind satisfies never}`);
    }
}

/**
 * Starts one BullMQ Worker per shard, each with `concurrency: 1` so jobs on
 * that shard run strictly in order. Throwing from the processor triggers
 * BullMQ's own retry/backoff; the user only hears about a failure once every
 * attempt has been exhausted (see the `failed` listener below) — a single
 * transient error just retries silently.
 */
export function startTurnWorkers(bot: TelegramBot): Worker<TurnJobData>[] {
    return Array.from({ length: env.queueShards }, (_, shard) => {
        const worker = new Worker<TurnJobData>(
            turnQueueName(shard),
            async (job) => {
                const input = await normalize(bot, job.data);
                const result = await runTurn(input);
                if (!result.duplicate) {
                    await sendChunkedReply(bot, job.data.msg.chat.id, result.replyText, assistantReplyOptions(job.data.msg));
                }
            },
            { connection: redisConnection, concurrency: 1 },
        );

        worker.on("completed", (job) => {
            bot.deleteMessage(job.data.msg.chat.id, job.data.statusMessageId).catch(() => undefined);
        });

        worker.on("failed", (job, error) => {
            console.error("Turn job failed", job?.id, error);
            if (!job) return;

            const maxAttempts = job.opts.attempts ?? 1;
            if (job.attemptsMade < maxAttempts) return; // more retries coming — stay quiet

            const ctx = threadOnlyOptions(job.data.msg);
            bot.sendMessage(job.data.msg.chat.id, ASSISTANT_ERROR_MESSAGE, ctx).catch(() => undefined);
            bot.deleteMessage(job.data.msg.chat.id, job.data.statusMessageId).catch(() => undefined);
        });

        return worker;
    });
}
