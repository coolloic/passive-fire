import Link from "next/link";
import type { ReactNode } from "react";
import { EscalationStateBadge } from "@/components/atoms/EscalationStateBadge";
import { EscalationLineList } from "@/components/molecules/EscalationLineList";
import { NoteList } from "@/components/molecules/NoteList";
import type { EscalationRecord } from "@/lib/data/escalation-repository";
import { RESOLUTION_LABELS, describeStoredLine } from "@/lib/escalation/labels";
import { formatDateTime, formatWorkDate } from "@/lib/format/date";

interface EscalationDetailViewProps {
  escalation: EscalationRecord;
  /** Link to the planned work, when the reader may open it. */
  plannedWorkHref?: string;
  /** Shown under the summary, e.g. the project manager's resolve form. */
  actions?: ReactNode;
  /** Shown under the notes, e.g. the add-note form while Open. */
  noteForm?: ReactNode;
}

/** An escalation's summary, lines and notes, shared by the team leader and project manager pages. */
export function EscalationDetailView({
  escalation,
  plannedWorkHref,
  actions,
  noteForm,
}: EscalationDetailViewProps) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section
        aria-label="Summary"
        className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-medium">
            {formatWorkDate(escalation.workDate)} · {escalation.crewName}
          </p>
          <EscalationStateBadge state={escalation.state} />
        </div>
        <p className="text-base text-neutral-600 dark:text-neutral-400">
          {escalation.siteName} · raised {formatDateTime(escalation.raisedAt)}
          {escalation.raisedByName ? ` by ${escalation.raisedByName}` : ""}
        </p>
        {escalation.shortageClearedAtSync ? (
          <p className="text-base">
            The shortage was no longer present when this escalation was sent.
          </p>
        ) : null}
        {escalation.resolution ? (
          <p className="text-base">
            <span className="font-medium">Resolution:</span>{" "}
            {RESOLUTION_LABELS[escalation.resolution]}
            {escalation.resolutionComment ? ` — ${escalation.resolutionComment}` : ""}
          </p>
        ) : null}
        {plannedWorkHref ? (
          <Link
            href={plannedWorkHref}
            className="inline-flex min-h-11 items-center text-base underline"
          >
            View the planned work
          </Link>
        ) : null}
      </section>
      <section aria-labelledby="lines-heading" className="flex flex-col gap-2">
        <h2 id="lines-heading" className="text-lg font-semibold">
          What was escalated
        </h2>
        <EscalationLineList lines={escalation.lines.map(describeStoredLine)} />
      </section>
      {/* After the lines, so the reader sees what was escalated before acting on it. */}
      {actions}
      <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
        <h2 id="notes-heading" className="text-lg font-semibold">
          Notes
        </h2>
        <NoteList notes={escalation.notes} formatTime={formatDateTime} />
        {noteForm}
      </section>
    </div>
  );
}
