import type { TurnAttachment } from "../open-ai-api/attachments.ts";
import type { SourceKind } from "../conversation/types.ts";

export type { TurnAttachment };

export interface TurnInput {
    chatId: number;
    /** 0 when the chat has no forum topics. */
    threadId: number;
    telegramMessageId: number;
    telegramUserId?: number;
    chatType?: string;
    sourceKind: SourceKind;
    /** What gets persisted as the user's turn (caption, transcript, or text). */
    transcriptText: string;
    /** What the model sees as this turn's text part — usually the same as transcriptText. */
    promptText: string;
    attachments?: TurnAttachment[];
    mediaMeta?: Record<string, unknown>;
}

export interface TurnResult {
    conversationId: number;
    replyText: string;
    /** True when this Telegram message was already processed — caller should not reply again. */
    duplicate: boolean;
}
