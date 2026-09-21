import OpenAI from "openai";

export const openAiApiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
