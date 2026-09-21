CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE message_embeddings (
    message_id      bigint PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    embedding       vector(1536) NOT NULL,
    model           text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_embeddings_conversation_idx ON message_embeddings (conversation_id);

-- Approximate nearest-neighbor index; cosine distance matches OpenAI's embedding space.
CREATE INDEX message_embeddings_hnsw_idx ON message_embeddings USING hnsw (embedding vector_cosine_ops);
