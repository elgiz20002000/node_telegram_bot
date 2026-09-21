import type { ResponseInputItem } from "openai/resources/responses/responses";
import type { RetrievedMessage } from "./embeddings.ts";
import type { StoredMessage } from "./types.ts";

export interface BuildContextInput {
    summaryText: string | null;
    summaryTokens: number;
    /** Messages found by semantic search, already restricted to ones older than the window. */
    retrieved?: RetrievedMessage[];
    /** Ascending by id (oldest first). */
    window: StoredMessage[];
    /** The current turn's own input item — always kept, never counted against the window budget. */
    newUserItem: ResponseInputItem;
}

/**
 * Assembles the `input` array for a Responses API call: an optional summary
 * of everything older, as much recent history as fits the token budget, and
 * the new turn. Pure and synchronous so it's cheap to unit-test — all I/O
 * (loading history, calling the model) happens around this, not inside it.
 *
 * `availableTokens` is the caller's remaining budget for summary + window,
 * i.e. already net of the model's reserved output, the `instructions` text
 * (a separate top-level field in the API call, but it still consumes context),
 * the new turn's own tokens, and a safety margin.
 */
export function buildContext(input: BuildContextInput, availableTokens: number): ResponseInputItem[] {
    const items: ResponseInputItem[] = [];
    let remaining = availableTokens;

    if (input.summaryText) {
        items.push({
            role: "developer",
            content: `Summary of earlier conversation:\n${input.summaryText}`,
        });
        remaining -= input.summaryTokens;
    }

    // Carved off before the window walk, like the summary, so it's never evicted by
    // window overflow and the window's own budget correctly accounts for its cost.
    if (input.retrieved && input.retrieved.length > 0) {
        const retrievedText = input.retrieved.map((m) => `${m.role}: ${m.content}`).join("\n---\n");
        const retrievedTokens = input.retrieved.reduce((sum, m) => sum + m.tokenEstimate, 0);
        items.push({
            role: "developer",
            content: `Possibly relevant earlier messages:\n${retrievedText}`,
        });
        remaining -= retrievedTokens;
    }

    const kept: StoredMessage[] = [];
    for (let i = input.window.length - 1; i >= 0; i--) {
        const message = input.window[i]!;
        if (message.tokenEstimate > remaining) break;
        kept.unshift(message);
        remaining -= message.tokenEstimate;
    }

    // A window starting mid-exchange (an assistant reply with no visible prompt) reads badly.
    while (kept.length > 0 && kept[0]!.role === "assistant") {
        kept.shift();
    }

    for (const message of kept) {
        const item: ResponseInputItem = {
            role: message.role,
            content: message.content,
            ...(message.phase ? { phase: message.phase } : {}),
        };
        items.push(item);
    }

    items.push(input.newUserItem);
    return items;
}
