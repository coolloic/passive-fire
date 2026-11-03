import Link from "next/link";
import { EscalationStateBadge } from "@/components/atoms/EscalationStateBadge";
import type { EscalationSummary } from "@/lib/data/escalation-repository";
import { RESOLUTION_LABELS } from "@/lib/escalation/labels";
import { formatDateTime, formatWorkDate } from "@/lib/format/date";

interface EscalationListProps {
  escalations: readonly EscalationSummary[];
  hrefFor: (id: string) => string;
  emptyMessage: string;
}

/** Escalations with state, planned work and resolution; each links to its detail. */
export function EscalationList({ escalations, hrefFor, emptyMessage }: EscalationListProps) {
  if (escalations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-base dark:border-neutral-700">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="flex max-w-3xl flex-col gap-3">
      {escalations.map((escalation) => (
        <li key={escalation.id}>
          <Link
            href={hrefFor(escalation.id)}
            className="flex min-h-11 flex-col gap-1 rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-500 hover:bg-neutral-100 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:bg-neutral-200 dark:border-neutral-700 dark:hover:border-neutral-400 dark:hover:bg-neutral-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-base font-medium">
                {formatWorkDate(escalation.workDate)} · {escalation.crewName}
              </span>
              <EscalationStateBadge state={escalation.state} />
            </div>
            <span className="text-base text-neutral-600 dark:text-neutral-400">
              {escalation.siteName} · raised {formatDateTime(escalation.raisedAt)}
              {escalation.raisedByName ? ` by ${escalation.raisedByName}` : ""}
            </span>
            {escalation.resolution ? (
              <span className="text-base">
                Resolution: {RESOLUTION_LABELS[escalation.resolution]}
              </span>
            ) : null}
            {escalation.shortageClearedAtSync ? (
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Shortage no longer present at sync
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
