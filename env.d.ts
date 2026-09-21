declare namespace NodeJS {
    interface ProcessEnv {
        TELEGRAM_BOT_TOKEN: string;
        OPENAI_API_KEY: string;
        ROLE?: string;
        DATABASE_URL: string;
        REDIS_URL?: string;
        QUEUE_SHARDS?: string;
        OPENAI_MODEL?: string;
        OPENAI_SUMMARY_MODEL?: string;
        OPENAI_EMBEDDING_MODEL?: string;
        CONTEXT_TOKEN_BUDGET?: string;
        SUMMARY_TRIGGER_MESSAGES?: string;
        SUMMARY_KEEP_RECENT?: string;
    }
}
