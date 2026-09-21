import fs from "fs";
import { openAiApiClient } from "./openAiClient.ts";

export { openAiApiClient } from "./openAiClient.ts";
export { attachUploadedFile } from "./attachments.ts";
export { responseAssistantTurn } from "./responseAssistantTurn.ts";

export const transcriptionAudio = (audio: string) => {
    try {
        const transcription = openAiApiClient.audio.transcriptions.create({
            file: fs.createReadStream(audio),
            model: "whisper-1",
        });

        return transcription;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to transcribe audio");
    }
};
