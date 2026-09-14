import type { Citation } from "@/lib/schemas";

export function CitationQuote({ citation }: { citation: Citation }) {
  return (
    <figure className="mt-2 border-l-2 border-border pl-3">
      <blockquote className="text-sm italic text-ink-soft">
        &ldquo;{citation.quote}&rdquo;
      </blockquote>
      {citation.clauseLabel && (
        <figcaption className="mt-1 text-xs text-muted">
          {citation.clauseLabel}
        </figcaption>
      )}
    </figure>
  );
}
