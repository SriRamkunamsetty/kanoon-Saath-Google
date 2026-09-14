"use client";

import { useState } from "react";
import { DocumentUpload } from "@/components/document-upload";
import { SimplifiedSummary } from "@/components/simplified-summary";
import { RiskFlagList } from "@/components/risk-flag-list";
import { LawyerPrepChecklist } from "@/components/lawyer-prep-checklist";
import { QaPanel } from "@/components/qa-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/schemas";

interface AnalyzeResponse {
  result?: AnalysisResult;
  sanitizedText?: string;
  warnings?: string[];
  error?: string;
}

export function AnalysisWorkspace() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);

  async function analyze(body: FormData | string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        ...(typeof body === "string"
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentText: body }),
            }
          : { body }),
      });
      const data: AnalyzeResponse = await response.json();
      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      setResult(data.result);
      setWarnings(data.warnings ?? []);
      // The server only ever holds this document for the duration of
      // this one request. It hands back the sanitized text it actually
      // analyzed so the client can carry it forward for follow-up
      // questions — see README "Why no database".
      setDocumentText(data.sanitizedText ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    await analyze(formData);
  }

  async function handleText(text: string) {
    await analyze(text);
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl text-ink">
          Understand your document before you sign
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Upload a rental agreement, offer letter, or freelance contract. Kanoon Saathi
          explains it in plain language, flags anything one-sided, and gives you
          questions worth asking before you commit — with every claim tied to an exact
          quote from your document.
        </p>
        <div className="mt-10">
          <DocumentUpload onSubmitFile={handleFile} onSubmitText={handleText} isLoading={isLoading} />
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Your document, explained</h1>
        <Button variant="secondary" size="sm" onClick={() => setResult(null)}>
          Analyze another document
        </Button>
      </div>

      {warnings.length > 0 && (
        <ul className="mb-6 space-y-1 rounded-md bg-caution-soft px-4 py-3 text-sm text-caution">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="risks">Risks ({result.riskFlags.length})</TabsTrigger>
          <TabsTrigger value="prepare">Prepare for a lawyer</TabsTrigger>
          <TabsTrigger value="ask">Ask a question</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <SimplifiedSummary result={result} />
        </TabsContent>
        <TabsContent value="risks">
          <RiskFlagList result={result} />
        </TabsContent>
        <TabsContent value="prepare">
          <LawyerPrepChecklist questions={result.lawyerQuestions} />
        </TabsContent>
        <TabsContent value="ask">
          <QaPanel documentText={documentText} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
