import type { ReadinessState } from "@/lib/readiness/types";

interface ReadinessBadgeProps {
  state: ReadinessState;
}

const LABELS: Record<ReadinessState, string> = {
  ready: "Ready",
  short: "Short",
  unknown: "Unknown",
};

const STYLES: Record<ReadinessState, string> = {
  ready: "border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  short: "border-red-700 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  unknown: "border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const ICON_PATHS: Record<ReadinessState, string> = {
  ready: "M5 12.5l4 4 10-10",
  short: "M6 6l12 12M18 6L6 18",
  unknown: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5",
};

/** Readiness state as text plus an icon; colour is never the only signal (WCAG 1.4.1). */
export function ReadinessBadge({ state }: ReadinessBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STYLES[state]}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d={ICON_PATHS[state]} />
      </svg>
      {LABELS[state]}
    </span>
  );
}
