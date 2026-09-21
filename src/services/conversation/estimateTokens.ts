const CHARS_PER_TOKEN = 3.6;
/** Rough allowance for message framing (role, wrapper) that raw character count misses. */
const MESSAGE_OVERHEAD_TOKENS = 8;

/**
 * Cheap token estimate used for context-budget bookkeeping — not an exact
 * tokenizer. Deliberately avoids a real tokenizer dependency (tiktoken needs
 * a native build, gpt-tokenizer ships ~2MB of rank tables) for a number that
 * only needs to be roughly right, since the budget already carries a safety
 * margin. Calibrate against `client.responses.inputTokens.count()` if the
 * estimate ever drifts.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN) + MESSAGE_OVERHEAD_TOKENS;
}
