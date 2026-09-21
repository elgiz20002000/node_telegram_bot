import type { Pool } from "pg";
import { env } from "../../config/env.ts";
import { openAiApiClient } from "../open-ai-api/openAiClient.ts";
import { toPgVector } from "./toPgVector.ts";
import type { MessageRole } from "./types.ts";

const RETRIEVAL_LIMIT = 5;

async function embedText(text: string): Promise<number[]> {
    const response = await openAiApiClient.embeddings.create({
        model: env.openAiEmbeddingModel,
        input: text,
    });
    return response.data[0]!.embedding;
}

/** Embeds a message and stores its vector — called after every message is saved, so it can be found later. */
export async function storeMessageEmbedding(
    pool: Pool,
    params: { messageId: number; conversationId: number; text: string },
): Promise<void> {
    const embedding = await embedText(params.text);
    await pool.query(
        `INSERT INTO message_embeddings (message_id, conversation_id, embedding, model)
         VALUES ($1, $2, $3::vector, $4)
         ON CONFLICT (message_id) DO NOTHING`,
        [params.messageId, params.conversationId, toPgVector(embedding), env.openAiEmbeddingModel],
    );
}

export interface RetrievedMessage {
    id: number;
    role: MessageRole;
    content: string;
    tokenEstimate: number;
}

/**
 * Finds the messages most semantically similar to `queryText`, restricted to
 * ones already behind the summary watermark — i.e. only messages that have
 * already fallen out of the recent window and been compressed into (or
 * dropped from) the rolling summary. This is what lets a specific old detail
 * survive even if the summary itself didn't preserve it.
 */
export async function retrieveRelevantMessages(
    pool: Pool,
    params: { conversationId: number; queryText: string; summaryThroughId: number },
): Promise<RetrievedMessage[]> {
    if (params.summaryThroughId <= 0) return []; // nothing old enough yet to be worth searching

    const queryEmbedding = await embedText(params.queryText);
    const { rows } = await pool.query(
        `SELECT m.id, m.role, m.content, m.token_estimate
         FROM message_embeddings e
         JOIN messages m ON m.id = e.message_id
         WHERE e.conversation_id = $1 AND e.message_id <= $2
         ORDER BY e.embedding <=> $3::vector
         LIMIT $4`,
        [params.conversationId, params.summaryThroughId, toPgVector(queryEmbedding), RETRIEVAL_LIMIT],
    );

    return rows.map((row: any) => ({
        id: Number(row.id),
        role: row.role as MessageRole,
        content: row.content as string,
        tokenEstimate: Number(row.token_estimate),
    }));
}
