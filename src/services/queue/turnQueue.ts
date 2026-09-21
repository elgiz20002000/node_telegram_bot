import { Queue } from "bullmq";
import type { Message } from "node-telegram-bot-api";
import { env } from "../../config/env.ts";
import type { SourceKind } from "../conversation/types.ts";
import { redisConnection } from "./redisConnection.ts";
import { shardForChat } from "./shardForChat.ts";

export interface TurnJobData {
    kind: SourceKind;
    msg: Message;
    /** The receiver's "⏳ One moment…" message — the worker deletes it once the reply is ready. */
    statusMessageId: number;
}

export function turnQueueName(shard: number): string {
    return `turns-${shard}`;
}

const queues = Array.from(
    { length: env.queueShards },
    (_, shard) => new Queue<TurnJobData>(turnQueueName(shard), { connection: redisConnection }),
);

/**
 * Hands a Telegram message off to the queue instead of processing it inline.
 * The receiver calling this returns almost immediately; the actual model
 * call happens later, in whichever worker owns this chat's shard.
 */
export async function enqueueTurn(data: TurnJobData): Promise<void> {
    const shard = shardForChat(data.msg.chat.id, env.queueShards);
    const queue = queues[shard]!;
    await queue.add("turn", data, {
        // Same Telegram message enqueued twice (a resend, a retry) collapses to one job.
        // BullMQ rejects custom job IDs containing ':' (it's a reserved Redis key separator
        // internally, and only tolerated for a legacy 3-part repeatable-job format) — hyphens avoid that.
        jobId: `t-${data.msg.chat.id}-${data.msg.message_thread_id ?? 0}-${data.msg.message_id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { age: 3_600, count: 1_000 },
        removeOnFail: { age: 86_400 },
    });
}
