import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContext } from "./buildContext.ts";
import type { StoredMessage } from "./types.ts";

const newUserItem = { role: "user" as const, content: "What about the second point?" };

/** Test-only narrowing: every item this module builds is an EasyInputMessage-shaped object. */
function asMessage(item: unknown): { role: string; content: unknown; phase?: string } {
    return item as { role: string; content: unknown; phase?: string };
}

function message(overrides: Partial<StoredMessage> & Pick<StoredMessage, "id">): StoredMessage {
    return {
        role: "user",
        content: `message ${overrides.id}`,
        phase: null,
        tokenEstimate: 10,
        ...overrides,
    };
}

test("empty history with no summary produces just the new turn", () => {
    const result = buildContext({ summaryText: null, summaryTokens: 0, window: [], newUserItem }, 1000);
    assert.deepEqual(result, [newUserItem]);
});

test("summary is emitted first as a developer item", () => {
    const result = buildContext(
        { summaryText: "User is named Elgiz.", summaryTokens: 20, window: [], newUserItem },
        1000,
    );
    assert.equal(result.length, 2);
    assert.equal(asMessage(result[0]).role, "developer");
    assert.match(asMessage(result[0]).content as string, /User is named Elgiz\./);
    assert.equal(result[1], newUserItem);
});

test("keeps messages that fit and drops older ones that don't", () => {
    const window: StoredMessage[] = [
        message({ id: 1, role: "user", tokenEstimate: 10 }),
        message({ id: 2, role: "assistant", tokenEstimate: 10 }),
        message({ id: 3, role: "user", tokenEstimate: 10 }),
        message({ id: 4, role: "assistant", tokenEstimate: 10 }),
    ];

    // Budget for exactly the last two messages (20 tokens), not enough for all four.
    const result = buildContext({ summaryText: null, summaryTokens: 0, window, newUserItem }, 20);

    assert.equal(result.length, 3); // message 3, message 4, new turn
    assert.equal((result[0] as StoredMessage).content, "message 3");
    assert.equal((result[1] as StoredMessage).content, "message 4");
    assert.equal(result[2], newUserItem);
});

test("drops a leading assistant message left over after eviction", () => {
    const window: StoredMessage[] = [
        message({ id: 1, role: "user", tokenEstimate: 10 }),
        message({ id: 2, role: "assistant", tokenEstimate: 10 }),
        message({ id: 3, role: "assistant", tokenEstimate: 10 }),
    ];

    // Budget fits only messages 2 and 3 (20 tokens) — both assistant, since message 1 (user) doesn't fit.
    const result = buildContext({ summaryText: null, summaryTokens: 0, window, newUserItem }, 20);

    // Both assistant messages get dropped since neither has a preceding user message in the kept window.
    assert.equal(result.length, 1);
    assert.equal(result[0], newUserItem);
});

test("summary is never evicted even when the budget is fully consumed by it", () => {
    const window: StoredMessage[] = [message({ id: 1, tokenEstimate: 10 })];
    const result = buildContext(
        { summaryText: "long summary", summaryTokens: 1000, window, newUserItem },
        5, // budget smaller than the summary itself
    );

    assert.equal(result.length, 2); // summary + new turn; window message doesn't fit
    assert.equal(asMessage(result[0]).role, "developer");
    assert.equal(result[1], newUserItem);
});

test("assistant phase is preserved on kept messages", () => {
    const window: StoredMessage[] = [
        message({ id: 1, role: "assistant", phase: "final_answer", tokenEstimate: 10 }),
    ];
    // Nothing precedes it, so the leading-assistant rule strips it — use a user message before it instead.
    const withPrecedingUser: StoredMessage[] = [
        message({ id: 0, role: "user", tokenEstimate: 10 }),
        ...window,
    ];

    const result = buildContext(
        { summaryText: null, summaryTokens: 0, window: withPrecedingUser, newUserItem },
        1000,
    );

    const assistantItem = result.find((item) => "role" in item && item.role === "assistant") as
        | { phase?: string }
        | undefined;
    assert.equal(assistantItem?.phase, "final_answer");
});

test("retrieved messages are emitted as a developer item after the summary", () => {
    const result = buildContext(
        {
            summaryText: "User is named Elgiz.",
            summaryTokens: 20,
            retrieved: [{ id: 5, role: "user", content: "My vault is called react-native-ci", tokenEstimate: 10 }],
            window: [],
            newUserItem,
        },
        1000,
    );

    assert.equal(result.length, 3);
    assert.equal(asMessage(result[0]).role, "developer"); // summary
    assert.equal(asMessage(result[1]).role, "developer"); // retrieved block
    assert.match(asMessage(result[1]).content as string, /react-native-ci/);
    assert.equal(result[2], newUserItem);
});

test("retrieved block is never evicted, same as the summary", () => {
    const window: StoredMessage[] = [message({ id: 1, tokenEstimate: 10 })];
    const result = buildContext(
        {
            summaryText: null,
            summaryTokens: 0,
            retrieved: [{ id: 5, role: "user", content: "old detail", tokenEstimate: 1000 }],
            window,
            newUserItem,
        },
        5, // budget smaller than the retrieved block itself
    );

    assert.equal(result.length, 2); // retrieved block + new turn; window message doesn't fit
    assert.equal(asMessage(result[0]).role, "developer");
    assert.equal(result[1], newUserItem);
});

test("no retrieved messages means no extra item", () => {
    const result = buildContext(
        { summaryText: null, summaryTokens: 0, retrieved: [], window: [], newUserItem },
        1000,
    );
    assert.deepEqual(result, [newUserItem]);
});
