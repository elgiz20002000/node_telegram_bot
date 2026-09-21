/**
 * Maps a chat to one of N queue shards. Each shard queue runs with
 * `concurrency: 1`, so every chat mapped to the same shard is processed
 * strictly in order — this is the free-tier substitute for BullMQ's
 * per-key job groups, which require BullMQ Pro. The trade-off: chats that
 * happen to collide on a shard queue behind each other. Raise `shardCount`
 * to reduce collisions rather than raising per-shard concurrency, which
 * would break the ordering guarantee entirely.
 */
export function shardForChat(chatId: number, shardCount: number): number {
    return Math.abs(chatId) % shardCount;
}
