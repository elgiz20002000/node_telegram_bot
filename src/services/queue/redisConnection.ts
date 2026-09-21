import { Redis } from "ioredis";
import { env } from "../../config/env.ts";

/**
 * One shared connection reused by every shard's Queue and Worker, rather
 * than one per shard — BullMQ duplicates it internally where it needs a
 * dedicated blocking connection anyway.
 */
export const redisConnection = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
});
