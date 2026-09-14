import { generateObject } from "ai";
import { textModel } from "@/lib/ai/client";
import { buildDocumentBlock, GROUNDING_RULE, NOT_LEGAL_ADVICE_RULE } from "@/lib/ai/prompts";
import { QaAnswerSchema, type QaAnswer } from "@/lib/schemas";
import { verifyCitation } from "@/lib/ai/verify";
import type { Chunk } from "@/lib/rag/chunk";

export async function answerQuestion(
  question: string,
  relevantChunks: Chunk[],
): Promise<QaAnswer> {
  const context = relevantChunks.map((c) => c.text).join("\n\n---\n\n");

  const { object } = await generateObject({
    model: textModel(),
    schema: QaAnswerSchema,
    system: [
      "Answer the user's question about their document using ONLY the",
      "excerpts provided below. These excerpts are the most relevant",
      "sections retrieved for this specific question — they may not be",
      "the whole document.",
      GROUNDING_RULE,
      NOT_LEGAL_ADVICE_RULE,
      "If the excerpts don't contain enough information to answer, set",
      "grounded to false and say so plainly instead of guessing.",
    ].join("\n"),
    prompt: `${buildDocumentBlock(context)}\n\nQuestion: ${question}`,
  });

  // Re-verify: a question-answering call is exactly as capable of an
  // ungrounded citation as the analysis call is, so it goes through
  // the same gate rather than being trusted because it's "just Q&A".
  const verifiedCitations = object.citations.filter((c) =>
    verifyCitation(c, context),
  );
  const stillGrounded = object.grounded && verifiedCitations.length > 0;

  return {
    grounded: stillGrounded,
    answer: stillGrounded
      ? object.answer
      : "This document doesn't contain enough information to answer that with confidence. Consider asking a professional or checking for an accompanying document.",
    citations: verifiedCitations,
  };
}
