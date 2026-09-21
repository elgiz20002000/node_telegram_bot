import { test } from "node:test";
import assert from "node:assert/strict";
import { shardForChat } from "./shardForChat.ts";

test("shardForChat stays within [0, shardCount)", () => {
    for (const chatId of [1, 42, 999_999, 123_456_789]) {
        const shard = shardForChat(chatId, 16);
        assert.ok(shard >= 0 && shard < 16);
    }
});

test("shardForChat is deterministic for the same chat", () => {
    assert.equal(shardForChat(555, 16), shardForChat(555, 16));
});

test("shardForChat handles negative chat ids (Telegram groups)", () => {
    const shard = shardForChat(-100123456, 16);
    assert.ok(shard >= 0 && shard < 16);
});

test("shardForChat distributes different chats across shards", () => {
    const shards = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((chatId) => shardForChat(chatId, 4)));
    assert.ok(shards.size > 1);
});
