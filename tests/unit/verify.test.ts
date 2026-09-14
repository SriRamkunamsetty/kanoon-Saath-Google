import { describe, expect, it } from "vitest";
import { verifyCitation, verifyDraftAnalysis } from "@/lib/ai/verify";
import type { DraftAnalysis } from "@/lib/schemas";

const SOURCE = `1. The tenant shall pay a security deposit equal to two months' rent.
2. The landlord may terminate this agreement at any time without notice.`;

describe("verifyCitation", () => {
  it("accepts a quote that appears verbatim in the source", () => {
    expect(
      verifyCitation({ quote: "security deposit equal to two months' rent" }, SOURCE),
    ).toBe(true);
  });

  it("accepts a quote differing only in whitespace or curly quotes", () => {
    expect(
      verifyCitation(
        { quote: "security   deposit equal to two months\u2019 rent" },
        SOURCE,
      ),
    ).toBe(true);
  });

  it("rejects a quote that does not appear in the source at all", () => {
    expect(
      verifyCitation({ quote: "the landlord must return the deposit within 7 days" }, SOURCE),
    ).toBe(false);
  });

  it("rejects a quote below the minimum verifiable length even if it appears", () => {
    // "rent." appears in the source, but a 5-character match is not
    // meaningful evidence for a claim — this guards against a model
    // gaming the check with trivially common fragments.
    expect(verifyCitation({ quote: "rent." }, SOURCE)).toBe(false);
  });

  it("rejects a fabricated quote that is a near-miss paraphrase", () => {
    expect(
      verifyCitation({ quote: "landlord can end the lease anytime with no warning" }, SOURCE),
    ).toBe(false);
  });
});

describe("verifyDraftAnalysis", () => {
  const draft: DraftAnalysis = {
    documentSummary: "A short-term residential lease.",
    simplifiedClauses: [
      {
        title: "Security deposit",
        plainLanguage: "You pay two months' rent upfront as a deposit.",
        citation: { quote: "security deposit equal to two months' rent" },
      },
    ],
    riskFlags: [
      {
        severity: "red_flag",
        title: "No-notice termination",
        explanation: "The landlord can end the lease without warning.",
        recommendation: "Ask for a minimum notice period to be added.",
        citation: { quote: "terminate this agreement at any time without notice" },
      },
      {
        severity: "caution",
        title: "Fabricated clause",
        explanation: "This did not actually appear in the document.",
        recommendation: "N/A",
        citation: { quote: "the tenant may sublet with written consent" },
      },
    ],
  };

  it("keeps only claims whose citation is verified against the source", () => {
    const { simplifiedClauses, riskFlags, stats } = verifyDraftAnalysis(draft, SOURCE);

    expect(simplifiedClauses).toHaveLength(1);
    expect(riskFlags).toHaveLength(1);
    expect(riskFlags[0]?.title).toBe("No-notice termination");
    expect(stats).toEqual({ totalClaims: 3, verifiedClaims: 2, droppedClaims: 1 });
  });
});
