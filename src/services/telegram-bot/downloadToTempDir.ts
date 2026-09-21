import fs from "fs";
import os from "os";
import path from "path";
import type TelegramBot from "node-telegram-bot-api";

export interface DownloadedFile {
    localPath: string;
    cleanup: () => Promise<void>;
}

/**
 * Downloads a Telegram file into a fresh per-download temp directory instead
 * of a shared `tmp-files`/`tmp-audio` folder under `process.cwd()` — that
 * directory is read-only or wiped on restart in most container runtimes,
 * and being shared across concurrent downloads is a collision surface.
 */
export async function downloadToTempDir(bot: TelegramBot, fileId: string): Promise<DownloadedFile> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tgbot-"));
    const localPath = await bot.downloadFile(fileId, dir);
    return {
        localPath,
        cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }),
    };
}
