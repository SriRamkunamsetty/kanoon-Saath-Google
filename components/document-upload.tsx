"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  onSubmitFile: (file: File) => void;
  onSubmitText: (text: string) => void;
  isLoading: boolean;
}

export function DocumentUpload({ onSubmitFile, onSubmitText, isLoading }: DocumentUploadProps) {
  const [pastedText, setPastedText] = useState("");
  const fileInputId = useId();
  const textareaId = useId();

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={fileInputId} className="mb-2 block text-sm font-medium text-ink">
          Upload a PDF or text file
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf"
          disabled={isLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSubmitFile(file);
          }}
          className="block w-full rounded-md border border-border bg-paper-raised text-sm text-ink file:mr-4 file:rounded file:border-0 file:bg-trust file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper hover:file:bg-trust/90 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div>
        <label htmlFor={textareaId} className="mb-2 block text-sm font-medium text-ink">
          Paste the text of your document
        </label>
        <textarea
          id={textareaId}
          rows={8}
          disabled={isLoading}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste your rental agreement, offer letter, or freelance contract here..."
          className="w-full rounded-md border border-border bg-paper-raised p-3 text-sm text-ink placeholder:text-muted disabled:opacity-50"
        />
        <div className="mt-3">
          <Button
            type="button"
            disabled={isLoading || pastedText.trim().length < 20}
            onClick={() => onSubmitText(pastedText)}
          >
            {isLoading ? "Analyzing…" : "Analyze document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
