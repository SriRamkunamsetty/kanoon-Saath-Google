import { sanitizeDocumentText } from "@/lib/security/sanitize";
import { simplifyAndFlagRisks } from "@/lib/ai/agents/simplify-and-flag";
import { prepareLawyerQuestions } from "@/lib/ai/agents/prepare-lawyer-questions";
import { verifyDraftAnalysis } from "@/lib/ai/verify";
import type { AnalysisResult } from "@/lib/schemas";

/**
 * Note on scope: this pipeline deliberately does not chunk the
 * document before analysis. A rental agreement or offer letter fits
 * comfortably in the model's context window, and passing it whole
 * lets the risk-flagger see how clauses interact (e.g. a short cure
 * period combined with a broad termination clause) — something
 * independently-processed chunks would miss. Chunking is reserved
 * for `lib/rag/retrieve.ts`, used only by the follow-up Q&A endpoint,
 * where the goal is narrowing a large document to the few sections
 * relevant to one question, not analyzing the whole thing.
 */
export async function runAnalysisPipeline(rawText: string): Promise<{
  result: AnalysisResult;
  sanitizedText: string;
  warnings: string[];
}> {
  const { text: sanitizedText, warnings } = sanitizeDocumentText(rawText);

  const draft = await simplifyAndFlagRisks(sanitizedText);
  const { simplifiedClauses, riskFlags, stats } = verifyDraftAnalysis(
    draft,
    sanitizedText,
  );
  const lawyerQuestions = await prepareLawyerQuestions(riskFlags, simplifiedClauses);

  const result: AnalysisResult = {
    documentSummary: draft.documentSummary,
    simplifiedClauses,
    riskFlags,
    lawyerQuestions,
    verification: stats,
  };

  return { result, sanitizedText, warnings };
}
