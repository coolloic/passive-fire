import { allocate } from "./allocate";
import { computeDemand } from "./demand";
import { deriveReadiness, type PlannedWorkInput, type PlannedWorkReadiness } from "./readiness";
import type { DemandLine, IsoDate, Supply } from "./types";

export interface OwnPlannedWorkInput extends PlannedWorkInput {
  createdAt: string;
}

export interface ComputeReadinessInput {
  /** The current user's planned work, with full scenario detail. */
  ownPlannedWork: readonly OwnPlannedWorkInput[];
  /** Other crews' demand (from `allocation_demand`, `isOwn: false`); it competes for the same supply. */
  otherDemand: readonly DemandLine[];
  supply: Supply;
  today: IsoDate;
}

/**
 * Readiness for the user's own planned work dated today or later, allocating supply across
 * every crew's demand in date order (spec FR-3, FR-4; ADR 0002).
 */
export function computeReadiness(input: ComputeReadinessInput): PlannedWorkReadiness[] {
  const upcoming = input.ownPlannedWork.filter((work) => work.workDate >= input.today);
  const ownDemand = computeDemand(
    upcoming.map((work) => ({
      plannedWorkId: work.plannedWorkId,
      workDate: work.workDate,
      createdAt: work.createdAt,
      isOwn: true,
      items: work.scenarios
        .filter((scenario) => scenario.nominatedSolutionId !== null)
        .map((scenario) => ({
          penetrationCount: scenario.penetrationCount,
          requirements: [...scenario.requirements],
        })),
    })),
  );
  const ownIds = new Set(upcoming.map((work) => work.plannedWorkId));
  const others = input.otherDemand.filter((line) => !ownIds.has(line.plannedWorkId));
  const allocations = allocate([...ownDemand, ...others], input.supply, input.today);
  return upcoming
    .slice()
    .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.createdAt.localeCompare(b.createdAt))
    .map((work) => deriveReadiness(work, allocations));
}
