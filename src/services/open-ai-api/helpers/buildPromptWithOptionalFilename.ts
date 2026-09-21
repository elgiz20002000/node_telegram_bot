const DEFAULT_DOC = "Read the attached file and answer helpfully. If you cannot read it, say what is missing.";
const DEFAULT_IMG = "Describe or answer based on this image. If you cannot interpret it, say so.";

export function buildPromptWithOptionalFilename(
    kind: "document" | "image",
    params: { userPrompt?: string; filename?: string | null },
): string {
    const base = params.userPrompt?.trim() ?? (kind === "image" ? DEFAULT_IMG : DEFAULT_DOC);
    const name = params.filename?.trim();
    if (!name) {
        return base;
    }
    return `${base}\n\n(Original file name: ${name})`;
}
