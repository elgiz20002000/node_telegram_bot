import type { ResponseInputItem } from "openai/resources/responses/responses";
import { env } from "../../config/env.ts";
import { pool } from "../db/pool.ts";
import { buildContext } from "../conversation/buildContext.ts";
import { estimateTokens } from "../conversation/estimateTokens.ts";
import { retrieveRelevantMessages, storeMessageEmbedding } from "../conversation/embeddings.ts";
import { shouldSummarize, summarizeConversation } from "../conversation/summarize.ts";
import { insertMessage, loadSnapshot, upsertConversation } from "../conversation/store.ts";
import { INSTRUCTIONS } from "../open-ai-api/constants.ts";
import { responseAssistantTurn } from "../open-ai-api/responseAssistantTurn.ts";
import type { TurnInput, TurnResult } from "./types.ts";

/** Headroom reserved for the model's own reply, in tokens. */
const RESERVED_OUTPUT_TOKENS = 4_000;
/** Fraction of the remaining budget left unused, since token estimates are approximate. */
const SAFETY_MARGIN_RATIO = 0.1;

const instructionsTokens = estimateTokens(INSTRUCTIONS);

function buildNewUserItem(input: TurnInput): ResponseInputItem {
    if (!input.attachments || input.attachments.length === 0) {
        return { role: "user", content: input.promptText };
    }
    return {
        role: "user",
        content: [...input.attachments.map((attachment) => attachment.part), { type: "input_text", text: input.promptText }],
    };
}

/**
 * The single flow every handler (text, voice, photo, document) reduces to:
 * persist the user's turn, assemble context under the token budget, call the
 * model, persist the reply, and fold old history into the rolling summary
 * when it's grown enough to be worth it.
 */
async function releaseAttachments(input: TurnInput): Promise<void> {
    if (!input.attachments) return;
    await Promise.all(input.attachments.map((attachment) => attachment.release().catch(() => undefined)));
}

export async function runTurn(input: TurnInput): Promise<TurnResult> {
    const conversation = await upsertConversation(pool, {
        chatId: input.chatId,
        threadId: input.threadId,
        chatType: input.chatType,
    });

    const userMessageId = await insertMessage(pool, {
        conversationId: conversation.id,
        role: "user",
        content: input.transcriptText,
        sourceKind: input.sourceKind,
        mediaMeta: input.mediaMeta,
        telegramMessageId: input.telegramMessageId,
        telegramUserId: input.telegramUserId,
        tokenEstimate: estimateTokens(input.transcriptText),
    });

    if (userMessageId === null) {
        // Same Telegram message already processed (retry, resend) — do nothing again.
        await releaseAttachments(input);
        return { conversationId: conversation.id, replyText: "", duplicate: true };
    }

    storeMessageEmbedding(pool, {
        messageId: userMessageId,
        conversationId: conversation.id,
        text: input.transcriptText,
    }).catch((error) => console.error("Failed to embed user message", userMessageId, error));

    try {
        const snapshot = await loadSnapshot(pool, conversation);
        const newUserItem = buildNewUserItem(input);
        const retrieved = await retrieveRelevantMessages(pool, {
            conversationId: conversation.id,
            queryText: input.promptText,
            summaryThroughId: conversation.summaryThroughId,
        });

        const newTurnTokens = estimateTokens(input.promptText);
        const availableTokens = Math.floor(
            (env.contextTokenBudget - RESERVED_OUTPUT_TOKENS - instructionsTokens - newTurnTokens) *
                (1 - SAFETY_MARGIN_RATIO),
        );

        const contextInput = buildContext(
            {
                summaryText: conversation.summaryText,
                summaryTokens: conversation.summaryTokens,
                retrieved,
                window: snapshot.window,
                newUserItem,
            },
            availableTokens,
        );

        const response = await responseAssistantTurn(contextInput);
        const replyText = response.output_text;

        const assistantMessageId = await insertMessage(pool, {
            conversationId: conversation.id,
            role: "assistant",
            content: replyText,
            sourceKind: "text",
            phase: "final_answer",
            tokenEstimate: estimateTokens(replyText),
            model: env.openAiModel,
            usage: response.usage as unknown as Record<string, unknown>,
        });

        if (assistantMessageId !== null) {
            storeMessageEmbedding(pool, {
                messageId: assistantMessageId,
                conversationId: conversation.id,
                text: replyText,
            }).catch((error) => console.error("Failed to embed assistant message", assistantMessageId, error));
        }

        const updatedWindow = [
            ...snapshot.window,
            {
                id: userMessageId,
                role: "user" as const,
                content: input.transcriptText,
                phase: null,
                tokenEstimate: newTurnTokens,
            },
        ];
        if (shouldSummarize(updatedWindow)) {
            summarizeConversation(pool, conversation, updatedWindow).catch((error) => {
                console.error("Failed to summarize conversation", conversation.id, error);
            });
        }

        return { conversationId: conversation.id, replyText, duplicate: false };
    } finally {
        await releaseAttachments(input);
    }
}
