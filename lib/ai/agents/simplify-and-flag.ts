import { generateObject } from "ai";
import { textModel } from "@/lib/ai/client";
import { buildDocumentBlock, GROUNDING_RULE, NOT_LEGAL_ADVICE_RULE } from "@/lib/ai/prompts";
import { DraftAnalysisSchema, type DraftAnalysis } from "@/lib/schemas";

/**
 * The simplifier and risk-flagger are combined into one call rather
 * than two. They read the same document with the same context window
 * and don't depend on each other's output, so merging them halves
 * the token cost and latency of the two most expensive steps in the
 * pipeline without changing what either one produces — a direct
 * "efficiency" win, not just a code-organization one.
 */
export async function simplifyAndFlagRisks(
  documentText: string,
): Promise<DraftAnalysis> {
  const { object } = await generateObject({
    model: textModel(),
    schema: DraftAnalysisSchema,
    system: [
      "You help a non-lawyer (a renter or a freelance/gig worker in India)",
      "understand a legal document before they sign it or act on it.",
      GROUNDING_RULE,
      NOT_LEGAL_ADVICE_RULE,
      "",
      "For simplifiedClauses: cover the clauses that materially affect the",
      "user (payment, deposits, duration, termination, penalties,",
      "obligations) in the order they appear. Skip boilerplate that has no",
      "practical effect on the user.",
      "",
      "For riskFlags: flag anything one-sided, unusually costly, vague, or",
      "that limits the user's options. Use severity 'red_flag' only for",
      "clauses that are unusual or clearly disadvantageous compared to",
      "standard practice, 'caution' for clauses worth double-checking, and",
      "'info' for notable-but-normal terms.",
    ].join("\n"),
    prompt: buildDocumentBlock(documentText),
  });

  return object;
}
