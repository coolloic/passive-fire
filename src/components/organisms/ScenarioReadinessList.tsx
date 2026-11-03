import { ReadinessBadge } from "@/components/atoms/ReadinessBadge";
import type { ScenarioDetail } from "@/lib/services/planned-work-detail";

interface ScenarioReadinessListProps {
  scenarios: readonly ScenarioDetail[];
}

/** Each scenario in a planned work with its readiness and the reasons behind it. */
export function ScenarioReadinessList({ scenarios }: ScenarioReadinessListProps) {
  if (scenarios.length === 0) {
    return <p className="text-base">No scenarios are planned for this work.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {scenarios.map((scenario) => (
        <li
          key={scenario.scenarioId}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-medium">{scenario.label}</h3>
            <ReadinessBadge state={scenario.state} />
          </div>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            {scenario.penetrationCount}{" "}
            {scenario.penetrationCount === 1 ? "penetration" : "penetrations"} ·{" "}
            {scenario.solutionCode ? `Solution ${scenario.solutionCode}` : "No nominated solution"}
          </p>
          {scenario.reasons.length > 0 ? (
            <ul className="list-disc pl-5 text-base">
              {scenario.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
