CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    checksum   text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
    id                     bigserial PRIMARY KEY,
    chat_id                bigint NOT NULL,
    thread_id              bigint NOT NULL DEFAULT 0,
    chat_type              text,
    active_from_message_id bigint NOT NULL DEFAULT 0,
    summary_text           text,
    summary_through_id     bigint NOT NULL DEFAULT 0,
    summary_tokens         int NOT NULL DEFAULT 0,
    last_message_at        timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (chat_id, thread_id)
);

CREATE TABLE messages (
    id                   bigserial PRIMARY KEY,
    conversation_id      bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role                 text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content              text NOT NULL,
    source_kind          text NOT NULL DEFAULT 'text'
                             CHECK (source_kind IN ('text', 'voice', 'photo', 'document')),
    phase                text CHECK (phase IN ('commentary', 'final_answer')),
    media_meta           jsonb,
    telegram_message_id  bigint,
    telegram_user_id     bigint,
    token_estimate        int NOT NULL DEFAULT 0,
    model                text,
    usage                jsonb,
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_window_idx ON messages (conversation_id, id DESC);

CREATE UNIQUE INDEX messages_tg_uniq ON messages (conversation_id, telegram_message_id)
    WHERE telegram_message_id IS NOT NULL;

CREATE TABLE conversation_summaries (
    id                bigserial PRIMARY KEY,
    conversation_id   bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    summary_text      text NOT NULL,
    covers_through_id bigint NOT NULL,
    token_estimate    int NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversation_summaries_conversation_idx
    ON conversation_summaries (conversation_id, covers_through_id DESC);
