/**
 * A user's legal document is untrusted input in exactly the way a
 * database row or an HTTP body is — it comes from outside the
 * system and must not be allowed to change how the system behaves.
 * This module is the one place that boundary is enforced, following
 * Google's Secure AI Framework recommendation to treat prompt
 * injection with the same discipline as SQL injection: sanitize and
 * bound the untrusted input, then keep it structurally separate from
 * instructions (the second half of that separation lives in
 * `lib/ai/prompts.ts`, which wraps this output in a labeled,
 * do-not-execute block before it ever reaches a model).
 *
 * Nothing here claims to "detect prompt injection" — pattern matching
 * on natural language cannot do that reliably, and a tool that
 * implied otherwise would be a false sense of security. What this
 * *can* do reliably: strip content that has no legitimate reason to
 * appear in a legal document's text layer (invisible/bidi Unicode
 * characters used to hide instructions from a human reader, control
 * characters), and bound the size of what a single request can push
 * through the pipeline.
 */

const MAX_DOCUMENT_LENGTH = 60_000;

// Zero-width and bidi-control characters are the standard technique
// for hiding text from a human skimming a document while a model
// still reads it. A single linear negated-class pass — no nested
// quantifiers, no backtracking — so this can't become a ReDoS vector
// on adversarial input.
const INVISIBLE_CHARS =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g;

// Control characters other than tab/newline/carriage-return. This is
// the one place in the codebase that's supposed to match control
// characters, so the lint rule that (rightly) flags them elsewhere is
// disabled for this single, deliberate line only.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export interface SanitizeResult {
  text: string;
  warnings: string[];
  truncated: boolean;
}

export function sanitizeDocumentText(raw: string): SanitizeResult {
  const warnings: string[] = [];

  let text = raw.normalize("NFKC");

  if (INVISIBLE_CHARS.test(text)) {
    warnings.push(
      "Removed invisible/bidi-control characters (a known technique for hiding text from human readers).",
    );
  }
  // Reset lastIndex since .test() with a global flag is stateful.
  INVISIBLE_CHARS.lastIndex = 0;
  text = text.replace(INVISIBLE_CHARS, "");
  text = text.replace(CONTROL_CHARS, "");

  // Collapse runs of 3+ blank lines and trailing whitespace per line.
  // Both replacements operate on bounded, non-backtracking patterns.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  text = text.trim();

  let truncated = false;
  if (text.length > MAX_DOCUMENT_LENGTH) {
    text = text.slice(0, MAX_DOCUMENT_LENGTH);
    truncated = true;
    warnings.push(
      `Document exceeded ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters and was truncated. Analysis below only covers the part that was processed.`,
    );
  }

  return { text, warnings, truncated };
}
