import fs from "fs";
import { openAiApiClient } from "./openAiClient.ts";

/**
 * Uploads a local file for use with the Responses API (`input_file` / `input_image`).
 */
export async function uploadOpenAiUserFile(localPath: string) {
    return openAiApiClient.files.create({
        file: fs.createReadStream(localPath),
        purpose: "user_data",
    });
}
