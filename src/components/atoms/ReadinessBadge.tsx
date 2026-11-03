import { Check, CircleQuestionMark, X, type LucideIcon } from "lucide-react";
import type { ReadinessState } from "@/lib/readiness/types";

interface ReadinessBadgeProps {
  state: ReadinessState;
}

const LABELS: Record<ReadinessState, string> = {
  ready: "Ready",
  short: "Short",
  unknown: "Unknown",
};

const ICONS: Record<ReadinessState, LucideIcon> = {
  ready: Check,
  short: X,
  unknown: CircleQuestionMark,
};

const STYLES: Record<ReadinessState, string> = {
  ready: "border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  short: "border-red-700 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  unknown: "border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

/** Readiness state as text plus an icon; colour is never the only signal (WCAG 1.4.1). */
export function ReadinessBadge({ state }: ReadinessBadgeProps) {
  const Icon = ICONS[state];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STYLES[state]}`}
    >
      {/* Decorative: the visible label carries the meaning. */}
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
      {LABELS[state]}
    </span>
  );
}
