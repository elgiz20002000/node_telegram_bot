import type { ResponseInputContent } from "openai/resources/responses/responses";
import { openAiApiClient } from "./openAiClient.ts";
import { uploadOpenAiUserFile } from "./uploadOpenAiUserFile.ts";

export interface TurnAttachment {
    part: ResponseInputContent;
    /** Deletes the file from OpenAI. Call after the turn's `responses.create` call completes. */
    release: () => Promise<void>;
}

/**
 * Uploads a local file to OpenAI and returns the input part plus a cleanup
 * function. The file is NOT deleted here — deleting immediately after upload
 * (as the old `runResponseWithUploadedFile` did) means any later turn that
 * tried to reference this file by id would find it gone, which is exactly
 * why media turns are persisted as extracted text rather than file ids.
 */
export async function attachUploadedFile(
    localPath: string,
    toPart: (openAiFileId: string) => ResponseInputContent,
): Promise<TurnAttachment> {
    const uploaded = await uploadOpenAiUserFile(localPath);
    return {
        part: toPart(uploaded.id),
        release: async () => {
            await openAiApiClient.files.delete(uploaded.id).catch(() => undefined);
        },
    };
}
