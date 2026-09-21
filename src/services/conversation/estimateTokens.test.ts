import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTokens } from "./estimateTokens.ts";

test("estimateTokens grows with text length", () => {
    const short = estimateTokens("hi");
    const long = estimateTokens("hi".repeat(1000));
    assert.ok(long > short);
});

test("estimateTokens is always at least the fixed overhead", () => {
    assert.equal(estimateTokens(""), 8);
});

test("estimateTokens is deterministic", () => {
    const text = "What's my name?";
    assert.equal(estimateTokens(text), estimateTokens(text));
});
