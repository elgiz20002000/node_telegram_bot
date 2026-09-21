export type Role = "all" | "receiver" | "worker";

const ROLES = ["all", "receiver", "worker"] as const;

const errors: string[] = [];

function readString(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (value === undefined || value === "") {
        errors.push(`${name} is required`);
        return "";
    }
    return value;
}

function readInt(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return fallback;
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
        errors.push(`${name} must be an integer, got "${raw}"`);
        return fallback;
    }
    return value;
}

function readRole(name: string, fallback: Role): Role {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return fallback;
    if ((ROLES as readonly string[]).includes(raw)) return raw as Role;
    errors.push(`${name} must be one of ${ROLES.join(", ")}, got "${raw}"`);
    return fallback;
}

export const env = {
    role: readRole("ROLE", "all"),
    telegramBotToken: readString("TELEGRAM_BOT_TOKEN"),
    openAiApiKey: readString("OPENAI_API_KEY"),
    databaseUrl: readString("DATABASE_URL"),
    redisUrl: readString("REDIS_URL", "redis://localhost:6379"),
    openAiModel: readString("OPENAI_MODEL", "gpt-5.4-nano"),
    openAiSummaryModel: readString("OPENAI_SUMMARY_MODEL", "gpt-5.4-nano"),
    openAiEmbeddingModel: readString("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    contextTokenBudget: readInt("CONTEXT_TOKEN_BUDGET", 60_000),
    summaryTriggerMessages: readInt("SUMMARY_TRIGGER_MESSAGES", 40),
    summaryKeepRecent: readInt("SUMMARY_KEEP_RECENT", 20),
    queueShards: readInt("QUEUE_SHARDS", 16),
} as const;

if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join("\n  - ")}`);
}
