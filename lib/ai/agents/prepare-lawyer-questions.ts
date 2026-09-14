import { generateObject } from "ai";
import { textModel } from "@/lib/ai/client";
import { NOT_LEGAL_ADVICE_RULE } from "@/lib/ai/prompts";
import { LawyerPrepSchema, type RiskFlag, type SimplifiedClause } from "@/lib/schemas";

/**
 * Deliberately takes the already-verified risk flags as input, not
 * the raw document — it only ever turns claims that survived citation
 * verification into questions, so a dropped (unverifiable) risk flag
 * can't still leak into the question list through this second call.
 */
export async function prepareLawyerQuestions(
  riskFlags: RiskFlag[],
  simplifiedClauses: SimplifiedClause[],
): Promise<string[]> {
  if (riskFlags.length === 0 && simplifiedClauses.length === 0) {
    return [];
  }

  const { object } = await generateObject({
    model: textModel(),
    schema: LawyerPrepSchema,
    system: [
      "Turn the risk flags and clause summaries below into a short list of",
      "concrete questions the user should bring to a lawyer, tenant-rights",
      "clinic, or legal-aid service.",
      NOT_LEGAL_ADVICE_RULE,
      "Prioritize the highest-severity items. Each question should be",
      "specific enough to ask verbatim — not 'ask about the deposit' but",
      "'ask whether the deposit amount is within the local Rent Control",
      "Act's cap, and how forfeiture would be calculated.'",
    ].join("\n"),
    prompt: JSON.stringify({ riskFlags, simplifiedClauses }, null, 2),
  });

  return object.questions;
}
