import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai/client";
import type { Chunk } from "@/lib/rag/chunk";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * A single document processed once per request doesn't justify a
 * managed vector database — an in-process cosine-similarity scan
 * over its chunk embeddings is both simpler and, at this scale,
 * faster than a network round trip to one would be.
 */
export async function retrieveRelevantChunks(
  question: string,
  chunks: Chunk[],
  topK = 5,
): Promise<Chunk[]> {
  if (chunks.length <= topK) return chunks;

  const [{ embedding: queryEmbedding }, { embeddings: chunkEmbeddings }] =
    await Promise.all([
      embed({ model: embeddingModel(), value: question }),
      embedMany({
        model: embeddingModel(),
        values: chunks.map((c) => c.text),
      }),
    ]);

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunkEmbeddings[i] ?? []),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}
