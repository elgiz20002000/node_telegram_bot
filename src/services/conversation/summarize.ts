import type { Pool } from "pg";
import { env } from "../../config/env.ts";
import { openAiApiClient } from "../open-ai-api/openAiClient.ts";
import { estimateTokens } from "./estimateTokens.ts";
import type { ConversationRow, StoredMessage } from "./types.ts";

const SUMMARY_MAX_TOKENS_HINT = 600;

/** True once the unsummarized tail has grown enough to be worth folding into the rolling summary. */
export function shouldSummarize(window: StoredMessage[]): boolean {
    if (window.length > env.summaryTriggerMessages) return true;
    const totalTokens = window.reduce((sum, message) => sum + message.tokenEstimate, 0);
    return totalTokens > env.contextTokenBudget * 0.5;
}

/**
 * Folds everything except the most recent `summaryKeepRecent` messages into
 * the conversation's rolling summary. The final UPDATE is a compare-and-swap
 * on `summary_through_id`: if another instance already summarized past this
 * point (two instances triggered concurrently), this one's update matches
 * zero rows and is silently skipped rather than clobbering newer work.
 */
export async function summarizeConversation(
    pool: Pool,
    conversation: ConversationRow,
    window: StoredMessage[],
): Promise<void> {
    const keepRecent = env.summaryKeepRecent;
    if (window.length <= keepRecent) return;

    const toFoldIn = window.slice(0, window.length - keepRecent);
    const cutoffId = toFoldIn[toFoldIn.length - 1]!.id;

    const transcript = toFoldIn.map((message) => `${message.role}: ${message.content}`).join("\n");
    const priorSummary = conversation.summaryText ? `Existing summary:\n${conversation.summaryText}\n\n` : "";

    const response = await openAiApiClient.responses.create({
        model: env.openAiSummaryModel,
        instructions:
            `Summarize the following conversation history in under ${SUMMARY_MAX_TOKENS_HINT} tokens. ` +
            "Preserve names, facts, decisions, and open questions. Be terse.",
        input: `${priorSummary}Conversation to fold in:\n${transcript}`,
    });

    const summaryText = response.output_text;
    const summaryTokens = estimateTokens(summaryText);

    await pool.query(
        `INSERT INTO conversation_summaries (conversation_id, summary_text, covers_through_id, token_estimate)
         VALUES ($1, $2, $3, $4)`,
        [conversation.id, summaryText, cutoffId, summaryTokens],
    );

    await pool.query(
        `UPDATE conversations
         SET summary_text = $2, summary_through_id = $3, summary_tokens = $4
         WHERE id = $1 AND summary_through_id = $5`,
        [conversation.id, summaryText, cutoffId, summaryTokens, conversation.summaryThroughId],
    );
}
