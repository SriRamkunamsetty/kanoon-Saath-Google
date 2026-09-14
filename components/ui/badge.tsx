import { cn } from "@/lib/utils";
import type { RiskSeverityT } from "@/lib/schemas";

const SEVERITY_LABEL: Record<RiskSeverityT, string> = {
  info: "Worth knowing",
  caution: "Double-check this",
  red_flag: "Red flag",
};

const SEVERITY_CLASS: Record<RiskSeverityT, string> = {
  info: "bg-trust-soft text-trust",
  caution: "bg-caution-soft text-caution",
  red_flag: "bg-alert-soft text-alert",
};

export function SeverityBadge({ severity }: { severity: RiskSeverityT }) {
  return (
    <span
      className={cn(
        "inline-block rounded px-2 py-0.5 text-xs font-medium",
        SEVERITY_CLASS[severity],
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
