import { test } from "node:test";
import assert from "node:assert/strict";
import { toPgVector } from "./toPgVector.ts";

test("toPgVector formats numbers as a pgvector literal", () => {
    assert.equal(toPgVector([0.1, 0.2, 0.3]), "[0.1,0.2,0.3]");
});

test("toPgVector handles a single value", () => {
    assert.equal(toPgVector([1]), "[1]");
});

test("toPgVector handles an empty vector", () => {
    assert.equal(toPgVector([]), "[]");
});
