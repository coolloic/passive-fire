import type { PlannedWorkRecord, ReadinessDataSource } from "@/lib/data/readiness-repository";
import { addDays } from "@/lib/format/date";
import { computeReadiness } from "@/lib/readiness/compute";
import type { IsoDate, ReadinessState } from "@/lib/readiness/types";

/** How many days the Planned Work list covers, including today (spec AC-5.1). */
export const PLANNED_WORK_WINDOW_DAYS = 14;

export interface PlannedWorkSummary {
  plannedWorkId: string;
  workDate: IsoDate;
  crewName: string;
  siteName: string;
  scenarioCount: number;
  state: ReadinessState;
  reliesOnDelivery: boolean;
}

/** Readiness summaries for the user's planned work from today for the next 14 days. */
export async function getPlannedWorkSummaries(
  source: ReadinessDataSource,
  today: IsoDate,
): Promise<PlannedWorkSummary[]> {
  const to = addDays(today, PLANNED_WORK_WINDOW_DAYS - 1);
  const [plannedWork, demand, supply] = await Promise.all([
    source.listOwnPlannedWork(today, to),
    source.getAllocationDemand(today),
    source.getSupply(),
  ]);
  const records = new Map<string, PlannedWorkRecord>(
    plannedWork.map((work) => [work.plannedWorkId, work]),
  );
  const readiness = computeReadiness({
    ownPlannedWork: plannedWork,
    otherDemand: demand,
    supply,
    today,
  });

  return readiness.map((result) => {
    const record = records.get(result.plannedWorkId)!;
    return {
      plannedWorkId: result.plannedWorkId,
      workDate: result.workDate,
      crewName: record.crewName,
      siteName: record.siteName,
      scenarioCount: record.scenarios.length,
      state: result.state,
      reliesOnDelivery: result.reliesOnDelivery,
    };
  });
}

/** Groups summaries by work date, keeping date order. */
export function groupByDate(
  summaries: readonly PlannedWorkSummary[],
): { date: IsoDate; items: PlannedWorkSummary[] }[] {
  const groups = new Map<IsoDate, PlannedWorkSummary[]>();
  for (const summary of summaries) {
    const group = groups.get(summary.workDate) ?? [];
    group.push(summary);
    groups.set(summary.workDate, group);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}
