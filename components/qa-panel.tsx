"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CitationQuote } from "@/components/citation-quote";
import type { QaAnswer } from "@/lib/schemas";

export function QaPanel({ documentText }: { documentText: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: QaAnswer }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, question: trimmed }),
      });
      const data: { answer?: QaAnswer; error?: string } = await response.json();
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      setHistory((prev) => [...prev, { question: trimmed, answer: data.answer! }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Ask a question about this document
        </label>
        <input
          id={inputId}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Can my landlord keep my deposit for normal wear and tear?"
          disabled={isLoading}
          className="flex-1 rounded-md border border-border bg-paper-raised p-2 text-sm text-ink placeholder:text-muted disabled:opacity-50"
        />
        <Button type="submit" disabled={isLoading || question.trim().length === 0}>
          {isLoading ? "Asking…" : "Ask"}
        </Button>
      </form>

      <div aria-live="polite" className="space-y-4">
        {error && <p className="text-sm text-alert">{error}</p>}
        {history.map((entry, i) => (
          <div key={i} className="border-l-4 border-trust bg-paper-raised p-4">
            <p className="text-sm font-medium text-ink">{entry.question}</p>
            <p className="mt-2 text-sm text-ink-soft">{entry.answer.answer}</p>
            {entry.answer.citations.map((citation, j) => (
              <CitationQuote key={j} citation={citation} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
