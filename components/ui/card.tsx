import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Deliberately not the identical-rounded-corner, soft-shadow card
 * seen on every generated SaaS UI. A left border whose color carries
 * meaning (set by callers via `accentClassName`) does double duty as
 * both a visual device and information — see RiskFlagList.
 */
export function Card({
  className,
  accentClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accentClassName?: string }) {
  return (
    <div
      className={cn(
        "border-l-4 border-border bg-paper-raised p-5",
        accentClassName,
        className,
      )}
      {...props}
    />
  );
}
