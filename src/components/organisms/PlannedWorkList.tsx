import { PlannedWorkCard } from "@/components/molecules/PlannedWorkCard";
import { relativeDayLabel } from "@/lib/format/date";
import type { IsoDate } from "@/lib/readiness/types";
import { groupByDate, type PlannedWorkSummary } from "@/lib/services/planned-work-summaries";

interface PlannedWorkListProps {
  summaries: readonly PlannedWorkSummary[];
  today: IsoDate;
}

/** The next 14 days of planned work, grouped by date, with an empty state. */
export function PlannedWorkList({ summaries, today }: PlannedWorkListProps) {
  if (summaries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-base dark:border-neutral-700">
        Nothing is scheduled for your crews in the next 14 days.
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {groupByDate(summaries).map((group) => (
        <section
          key={group.date}
          aria-labelledby={`day-${group.date}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`day-${group.date}`} className="text-lg font-semibold">
            {relativeDayLabel(group.date, today)}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.items.map((summary) => (
              <li key={summary.plannedWorkId}>
                <PlannedWorkCard
                  href={`/planned-work/${summary.plannedWorkId}`}
                  siteName={summary.siteName}
                  crewName={summary.crewName}
                  scenarioCount={summary.scenarioCount}
                  state={summary.state}
                  reliesOnDelivery={summary.reliesOnDelivery}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
