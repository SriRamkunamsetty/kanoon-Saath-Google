import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { CitationQuote } from "@/components/citation-quote";
import type { AnalysisResult } from "@/lib/schemas";

const ACCENT_CLASS = {
  red_flag: "border-alert",
  caution: "border-caution",
  info: "border-trust",
} as const;

const SEVERITY_ORDER = ["red_flag", "caution", "info"] as const;

export function RiskFlagList({ result }: { result: AnalysisResult }) {
  const sorted = [...result.riskFlags].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return (
    <div className="space-y-6">
      {result.verification.droppedClaims > 0 && (
        <p className="rounded-md bg-caution-soft px-4 py-3 text-sm text-caution">
          {result.verification.droppedClaims} potential point
          {result.verification.droppedClaims === 1 ? "" : "s"} were left out because they
          could not be matched back to an exact excerpt of your document — shown here are
          only the {result.verification.verifiedClaims} that passed that check.
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No notable risks were confidently identified.</p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((flag, i) => (
            <li key={i}>
              <Card accentClassName={ACCENT_CLASS[flag.severity]}>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={flag.severity} />
                  <h3 className="font-medium text-ink">{flag.title}</h3>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{flag.explanation}</p>
                <p className="mt-2 text-sm font-medium text-ink">
                  What to do: <span className="font-normal text-ink-soft">{flag.recommendation}</span>
                </p>
                <CitationQuote citation={flag.citation} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
