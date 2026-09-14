import { describe, expect, it } from "vitest";
import { sanitizeDocumentText } from "@/lib/security/sanitize";

describe("sanitizeDocumentText", () => {
  it("removes zero-width and bidi-control characters used to hide text", () => {
    const hidden = "Pay\u200B the\u200B full\u200B deposit\u202Eno matter what";
    const { text, warnings } = sanitizeDocumentText(hidden);
    expect(text).not.toMatch(/[\u200B\u202E]/);
    expect(warnings.some((w) => w.includes("invisible"))).toBe(true);
  });

  it("leaves ordinary legal text untouched aside from whitespace normalization", () => {
    const clean = "1. The tenant shall pay rent by the 5th of each month.";
    const { text, warnings } = sanitizeDocumentText(clean);
    expect(text).toBe(clean);
    expect(warnings).toHaveLength(0);
  });

  it("truncates documents over the length cap and warns about it", () => {
    const huge = "a".repeat(70_000);
    const { text, truncated, warnings } = sanitizeDocumentText(huge);
    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(60_000);
    expect(warnings.some((w) => w.includes("truncated"))).toBe(true);
  });

  it("collapses excessive blank lines", () => {
    const { text } = sanitizeDocumentText("Clause A\n\n\n\n\nClause B");
    expect(text).toBe("Clause A\n\nClause B");
  });

  it("processes a large adversarial input in well under a second (no ReDoS)", () => {
    // Pathological input for naive nested-quantifier regexes: long
    // runs of the character each pattern is looking for.
    const adversarial = ("\u200B".repeat(500) + " ".repeat(500) + "\n".repeat(500)).repeat(20);
    const start = performance.now();
    sanitizeDocumentText(adversarial);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
