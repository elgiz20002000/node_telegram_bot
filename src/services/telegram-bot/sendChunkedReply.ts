import type TelegramBot from "node-telegram-bot-api";

/** Telegram rejects messages over this length. */
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

function splitIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let rest = text;
    while (rest.length > maxLength) {
        const breakAt = rest.lastIndexOf("\n", maxLength);
        const cut = breakAt > maxLength * 0.5 ? breakAt : maxLength;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut).replace(/^\n/, "");
    }
    if (rest.length > 0) chunks.push(rest);
    return chunks;
}

/**
 * Sends a reply, splitting it if it's over Telegram's length limit, and
 * falling back to plain text if Markdown parsing fails — model output
 * regularly contains unbalanced `*`/`_` that would otherwise turn a good
 * answer into a generic error message.
 */
export async function sendChunkedReply(
    bot: TelegramBot,
    chatId: number,
    text: string,
    options: TelegramBot.SendMessageOptions,
): Promise<void> {
    const chunks = splitIntoChunks(text, TELEGRAM_MAX_MESSAGE_LENGTH);
    for (const chunk of chunks) {
        try {
            await bot.sendMessage(chatId, chunk, { ...options, parse_mode: "Markdown" });
        } catch {
            await bot.sendMessage(chatId, chunk, { ...options, parse_mode: undefined });
        }
    }
}
