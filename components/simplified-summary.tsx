import { Card } from "@/components/ui/card";
import { CitationQuote } from "@/components/citation-quote";
import type { AnalysisResult } from "@/lib/schemas";

export function SimplifiedSummary({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed text-ink">{result.documentSummary}</p>

      {result.simplifiedClauses.length === 0 ? (
        <p className="text-sm text-muted">
          No individually significant clauses were confidently identified in this document.
        </p>
      ) : (
        <ul className="space-y-4">
          {result.simplifiedClauses.map((clause, i) => (
            <li key={i}>
              <Card accentClassName="border-trust">
                <h3 className="font-medium text-ink">{clause.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{clause.plainLanguage}</p>
                <CitationQuote citation={clause.citation} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
