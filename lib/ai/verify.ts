import type { Citation, DraftAnalysis, RiskFlag, SimplifiedClause } from "@/lib/schemas";

/**
 * Deliberately NOT another LLM call. Asking a second model to grade
 * the first model's citations just relocates the hallucination risk
 * one level up — it's still a language model guessing whether text
 * matches text. A plain substring check on normalized strings is
 * slower to write, cheaper to run, fully deterministic, and trivial
 * to unit test (see tests/unit/verify.test.ts), which is exactly the
 * property you want in the one gate every claim has to pass through.
 */

const MIN_VERIFIABLE_QUOTE_LENGTH = 12;

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyCitation(citation: Citation, sourceText: string): boolean {
  const quote = citation.quote.trim();
  if (quote.length < MIN_VERIFIABLE_QUOTE_LENGTH) return false;
  return normalize(sourceText).includes(normalize(quote));
}

export interface VerificationStats {
  totalClaims: number;
  verifiedClaims: number;
  droppedClaims: number;
}

function filterByVerifiedCitation<T extends { citation: Citation }>(
  items: T[],
  sourceText: string,
): { kept: T[]; total: number; verified: number } {
  let verified = 0;
  const kept = items.filter((item) => {
    const ok = verifyCitation(item.citation, sourceText);
    if (ok) verified += 1;
    return ok;
  });
  return { kept, total: items.length, verified };
}

export function verifyDraftAnalysis(
  draft: DraftAnalysis,
  sourceText: string,
): {
  simplifiedClauses: SimplifiedClause[];
  riskFlags: RiskFlag[];
  stats: VerificationStats;
} {
  const clauses = filterByVerifiedCitation(draft.simplifiedClauses, sourceText);
  const risks = filterByVerifiedCitation(draft.riskFlags, sourceText);

  const total = clauses.total + risks.total;
  const verified = clauses.verified + risks.verified;

  return {
    simplifiedClauses: clauses.kept,
    riskFlags: risks.kept,
    stats: {
      totalClaims: total,
      verifiedClaims: verified,
      droppedClaims: total - verified,
    },
  };
}
