import type { Pool } from "pg";
import type { AssistantPhase, ConversationRow, ConversationSnapshot, MessageRole, SourceKind, StoredMessage } from "./types.ts";

const WINDOW_LOAD_LIMIT = 80;

function toConversationRow(row: any): ConversationRow {
    return {
        id: Number(row.id),
        chatId: Number(row.chat_id),
        threadId: Number(row.thread_id),
        activeFromMessageId: Number(row.active_from_message_id),
        summaryText: row.summary_text,
        summaryThroughId: Number(row.summary_through_id),
        summaryTokens: Number(row.summary_tokens),
    };
}

/** Finds or creates the conversation for this chat/thread, and bumps `last_message_at`. */
export async function upsertConversation(
    pool: Pool,
    params: { chatId: number; threadId: number; chatType?: string },
): Promise<ConversationRow> {
    const { rows } = await pool.query(
        `INSERT INTO conversations (chat_id, thread_id, chat_type, last_message_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (chat_id, thread_id)
         DO UPDATE SET last_message_at = now()
         RETURNING *`,
        [params.chatId, params.threadId, params.chatType ?? null],
    );
    return toConversationRow(rows[0]);
}

/**
 * Loads everything the context builder needs in one round trip: the summary
 * watermark (already on the conversation row) plus the most recent messages
 * after both the /reset watermark and the summary watermark.
 */
export async function loadSnapshot(pool: Pool, conversation: ConversationRow): Promise<ConversationSnapshot> {
    const { rows } = await pool.query(
        `SELECT id, role, content, phase, token_estimate
         FROM messages
         WHERE conversation_id = $1 AND id > GREATEST($2::bigint, $3::bigint)
         ORDER BY id DESC
         LIMIT $4`,
        [conversation.id, conversation.activeFromMessageId, conversation.summaryThroughId, WINDOW_LOAD_LIMIT],
    );

    const window: StoredMessage[] = rows
        .map((row: any) => ({
            id: Number(row.id),
            role: row.role as MessageRole,
            content: row.content as string,
            phase: (row.phase as AssistantPhase | null) ?? null,
            tokenEstimate: Number(row.token_estimate),
        }))
        .reverse(); // DB gave newest-first; the builder wants oldest-first.

    return { conversation, window };
}

export interface InsertMessageParams {
    conversationId: number;
    role: MessageRole;
    content: string;
    sourceKind: SourceKind;
    phase?: AssistantPhase;
    mediaMeta?: Record<string, unknown>;
    telegramMessageId?: number;
    telegramUserId?: number;
    tokenEstimate: number;
    model?: string;
    usage?: Record<string, unknown>;
}

/**
 * Inserts a message. When `telegramMessageId` is given and a message from
 * that Telegram update was already stored, this is a no-op and returns
 * `null` — the caller's durable signal that this update is a duplicate,
 * independent of anything upstream (queue dedup, retries, Telegram resends).
 */
export async function insertMessage(pool: Pool, params: InsertMessageParams): Promise<number | null> {
    const { rows } = await pool.query(
        `INSERT INTO messages (
            conversation_id, role, content, source_kind, phase, media_meta,
            telegram_message_id, telegram_user_id, token_estimate, model, usage
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (conversation_id, telegram_message_id) WHERE telegram_message_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [
            params.conversationId,
            params.role,
            params.content,
            params.sourceKind,
            params.phase ?? null,
            params.mediaMeta ?? null,
            params.telegramMessageId ?? null,
            params.telegramUserId ?? null,
            params.tokenEstimate,
            params.model ?? null,
            params.usage ?? null,
        ],
    );
    return rows.length > 0 ? Number(rows[0].id) : null;
}
