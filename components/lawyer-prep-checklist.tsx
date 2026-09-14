"use client";

import { useState } from "react";

export function LawyerPrepChecklist({ questions }: { questions: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted">
        No specific questions were generated — this usually means no significant risks
        were found in the document.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Bring these to a lawyer, tenant-rights clinic, or legal-aid service. Check them off
        as you get answers.
      </p>
      <ul className="space-y-3">
        {questions.map((question, i) => {
          const id = `question-${i}`;
          const isChecked = checked.has(i);
          return (
            <li key={i} className="flex items-start gap-3">
              <input
                id={id}
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                }}
                className="mt-1 h-4 w-4 rounded border-border text-trust"
              />
              <label
                htmlFor={id}
                className={isChecked ? "text-sm text-muted line-through" : "text-sm text-ink"}
              >
                {question}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
