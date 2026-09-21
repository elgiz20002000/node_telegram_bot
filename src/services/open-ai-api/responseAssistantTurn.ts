import type { ResponseInputItem } from "openai/resources/responses/responses";
import { env } from "../../config/env.ts";
import { INSTRUCTIONS } from "./constants.ts";
import { openAiApiClient } from "./openAiClient.ts";

/** Runs one Responses API call for an already-assembled conversation `input` array. */
export function responseAssistantTurn(input: ResponseInputItem[]) {
    return openAiApiClient.responses.create({
        model: env.openAiModel,
        instructions: INSTRUCTIONS,
        input,
    });
}
