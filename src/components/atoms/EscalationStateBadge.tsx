import { CircleCheck, CircleDot } from "lucide-react";
import type { EscalationState } from "@/lib/data/escalation-repository";

interface EscalationStateBadgeProps {
  state: EscalationState;
}

/** Open or Resolved, as text plus an icon. */
export function EscalationStateBadge({ state }: EscalationStateBadgeProps) {
  const open = state === "open";
  const Icon = open ? CircleDot : CircleCheck;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
        open
          ? "border-blue-700 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
          : "border-neutral-500 bg-neutral-50 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      }`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
      {open ? "Open" : "Resolved"}
    </span>
  );
}
