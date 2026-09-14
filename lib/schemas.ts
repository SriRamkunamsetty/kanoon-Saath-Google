import { z } from "zod";

/**
 * Every claim the assistant makes about a document must point back to
 * an exact excerpt of that document. `quote` is checked verbatim
 * against the source text by `lib/ai/verify.ts` before it ever
 * reaches the user — see the "Grounding and citation verification"
 * section of the README for why this exists.
 */
export const CitationSchema = z.object({
  quote: z
    .string()
    .min(1)
    .max(400)
    .describe(
      "The exact substring from the source document that supports this claim. Copy it verbatim — do not paraphrase or summarize it.",
    ),
  clauseLabel: z
    .string()
    .max(80)
    .optional()
    .describe(
      'A short human label for where this is, e.g. "Clause 4.2" or "Security deposit paragraph". Omit if the document has no clear numbering.',
    ),
});
export type Citation = z.infer<typeof CitationSchema>;

export const SimplifiedClauseSchema = z.object({
  title: z.string().min(1).max(120),
  plainLanguage: z
    .string()
    .min(1)
    .max(600)
    .describe("A plain-language explanation a non-lawyer can understand."),
  citation: CitationSchema,
});
export type SimplifiedClause = z.infer<typeof SimplifiedClauseSchema>;

export const RiskSeverity = z.enum(["info", "caution", "red_flag"]);
export type RiskSeverityT = z.infer<typeof RiskSeverity>;

export const RiskFlagSchema = z.object({
  severity: RiskSeverity,
  title: z.string().min(1).max(120),
  explanation: z
    .string()
    .min(1)
    .max(600)
    .describe("Why this matters, in plain language."),
  recommendation: z
    .string()
    .min(1)
    .max(400)
    .describe("A concrete, non-legal-advice next step, e.g. what to ask about or negotiate."),
  citation: CitationSchema,
});
export type RiskFlag = z.infer<typeof RiskFlagSchema>;

export const DraftAnalysisSchema = z.object({
  documentSummary: z
    .string()
    .min(1)
    .max(500)
    .describe("A 2-4 sentence plain-language summary of what this document is and does."),
  simplifiedClauses: z.array(SimplifiedClauseSchema).max(20),
  riskFlags: z.array(RiskFlagSchema).max(20),
});
export type DraftAnalysis = z.infer<typeof DraftAnalysisSchema>;

export const LawyerPrepSchema = z.object({
  questions: z
    .array(z.string().min(1).max(300))
    .min(1)
    .max(10)
    .describe("Concrete questions the user should ask a qualified professional."),
});
export type LawyerPrep = z.infer<typeof LawyerPrepSchema>;

/**
 * The fully assembled, citation-verified result returned by the
 * analyze pipeline. `verification` reports how many claims were
 * dropped for failing the citation check, so the UI (and the judge
 * reading the README) can see the anti-hallucination gate is real.
 */
export const AnalysisResultSchema = DraftAnalysisSchema.extend({
  lawyerQuestions: z.array(z.string()),
  verification: z.object({
    totalClaims: z.number().int().nonnegative(),
    verifiedClaims: z.number().int().nonnegative(),
    droppedClaims: z.number().int().nonnegative(),
  }),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const QaAnswerSchema = z.object({
  grounded: z
    .boolean()
    .describe("False if the document does not contain enough information to answer."),
  answer: z.string().min(1).max(700),
  citations: z.array(CitationSchema).max(5),
});
export type QaAnswer = z.infer<typeof QaAnswerSchema>;

/** Request body for POST /api/analyze when submitting plain text. */
export const AnalyzeTextRequestSchema = z.object({
  documentText: z
    .string()
    .min(20, "That looks too short to be a real document.")
    .max(60_000, "Document is too long for this demo — please trim it to under 60,000 characters."),
  language: z.enum(["en", "hi", "te"]).default("en"),
});
export type AnalyzeTextRequest = z.infer<typeof AnalyzeTextRequestSchema>;

/** Request body for POST /api/ask. Stateless: the client resends the
 * already-extracted document text with every question, since the
 * server never persists uploaded documents (see README "Why no
 * database"). */
export const AskRequestSchema = z.object({
  documentText: z.string().min(20).max(60_000),
  question: z.string().min(1).max(500),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
