/** pgvector's text input format for a vector literal, e.g. "[0.1,0.2,0.3]". */
export function toPgVector(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
}
