import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Model names on the Gemini API change more often than most of this
 * codebase — both defaults below are overridable by environment
 * variable specifically so a naming change doesn't require a code
 * edit. Before deploying, confirm the current recommended flash and
 * embedding model names at https://ai.google.dev/gemini-api/docs/models.
 */
const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  // Thrown lazily by the SDK on first real call in production, but a
  // loud startup warning saves a confusing 500 during local dev.
  console.warn(
    "[ai/client] GOOGLE_GENERATIVE_AI_API_KEY is not set. Copy .env.example to " +
      ".env.local and add a key from https://aistudio.google.com/apikey.",
  );
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export function textModel() {
  return google(process.env.GEMINI_MODEL ?? DEFAULT_TEXT_MODEL);
}

export function embeddingModel() {
  return google.textEmbeddingModel(
    process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
  );
}
