import { test } from "node:test";
import assert from "node:assert/strict";
import type { Message } from "node-telegram-bot-api";
import { normalizeText } from "./text.ts";

function fixture(overrides: Partial<Message>): Message {
    return {
        message_id: 42,
        date: 0,
        chat: { id: 100, type: "private" },
        text: "hello",
        ...overrides,
    } as Message;
}

test("normalizeText carries the message text as both transcript and prompt", () => {
    const result = normalizeText(fixture({ text: "What about the second point?" }));
    assert.equal(result.transcriptText, "What about the second point?");
    assert.equal(result.promptText, "What about the second point?");
    assert.equal(result.sourceKind, "text");
});

test("normalizeText defaults threadId to 0 outside forum topics", () => {
    const result = normalizeText(fixture({ message_thread_id: undefined }));
    assert.equal(result.threadId, 0);
});

test("normalizeText preserves the forum topic thread id", () => {
    const result = normalizeText(fixture({ message_thread_id: 7 }));
    assert.equal(result.threadId, 7);
});

test("normalizeText carries chat id, telegram message id, and sender", () => {
    const result = normalizeText(fixture({ chat: { id: 555, type: "private" }, message_id: 9, from: { id: 321, is_bot: false, first_name: "E" } }));
    assert.equal(result.chatId, 555);
    assert.equal(result.telegramMessageId, 9);
    assert.equal(result.telegramUserId, 321);
});
