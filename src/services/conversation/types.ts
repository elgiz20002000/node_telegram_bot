export type MessageRole = "user" | "assistant" | "system";
export type SourceKind = "text" | "voice" | "photo" | "document";
export type AssistantPhase = "commentary" | "final_answer";

export interface StoredMessage {
    id: number;
    role: MessageRole;
    content: string;
    phase: AssistantPhase | null;
    tokenEstimate: number;
}

export interface ConversationRow {
    id: number;
    chatId: number;
    threadId: number;
    activeFromMessageId: number;
    summaryText: string | null;
    summaryThroughId: number;
    summaryTokens: number;
}

/** Everything the context builder needs, loaded in one query per conversation. */
export interface ConversationSnapshot {
    conversation: ConversationRow;
    /** Ascending by id (oldest first), already filtered to what's after the /reset watermark and the summary watermark. */
    window: StoredMessage[];
}
