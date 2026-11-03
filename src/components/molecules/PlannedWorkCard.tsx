import { AppLink } from "@/components/atoms/AppLink";
import { ReadinessBadge } from "@/components/atoms/ReadinessBadge";
import type { ReadinessState } from "@/lib/readiness/types";

interface PlannedWorkCardProps {
  href: string;
  siteName: string;
  crewName: string;
  scenarioCount: number;
  state: ReadinessState;
  reliesOnDelivery: boolean;
}

/** One planned work in the list; the whole card is the link (large touch target). */
export function PlannedWorkCard({
  href,
  siteName,
  crewName,
  scenarioCount,
  state,
  reliesOnDelivery,
}: PlannedWorkCardProps) {
  return (
    <AppLink
      href={href}
      className="flex min-h-11 flex-col gap-2 rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:border-neutral-700"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-base font-medium">{siteName}</span>
        <ReadinessBadge state={state} />
      </div>
      <span className="text-base text-neutral-600 dark:text-neutral-400">
        {crewName} · {scenarioCount} {scenarioCount === 1 ? "scenario" : "scenarios"}
      </span>
      {reliesOnDelivery ? (
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Relies on delivery
        </span>
      ) : null}
    </AppLink>
  );
}
