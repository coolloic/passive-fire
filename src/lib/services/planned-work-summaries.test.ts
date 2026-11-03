import { describe, expect, it, vi } from "vitest";
import type { PlannedWorkRecord, ReadinessDataSource } from "@/lib/data/readiness-repository";
import {
  getPlannedWorkSummaries,
  groupByDate,
  type PlannedWorkSummary,
} from "./planned-work-summaries";

const TODAY = "2026-11-10";

function record(id: string, workDate: string, collarsPerPenetration = 1): PlannedWorkRecord {
  return {
    plannedWorkId: id,
    workDate,
    createdAt: `2026-10-01T00:00:0${id.length}Z`,
    crewName: "Crew Alpha",
    siteName: "Harbour View",
    scenarios: [
      {
        scenarioId: "s1",
        penetrationCount: 5,
        nominatedSolutionId: "sol",
        requirements: [{ productId: "collar", quantityPerPenetration: collarsPerPenetration }],
      },
    ],
  };
}

function source(
  records: PlannedWorkRecord[],
  stock: number,
): ReadinessDataSource & { listOwnPlannedWork: ReturnType<typeof vi.fn> } {
  return {
    listOwnPlannedWork: vi.fn(async () => records),
    getAllocationDemand: vi.fn(async () => []),
    getSupply: vi.fn(async () => ({ stock: new Map([["collar", stock]]), deliveries: [] })),
  };
}

describe("getPlannedWorkSummaries", () => {
  it("asks for today plus the next 13 days", async () => {
    const data = source([], 0);
    await getPlannedWorkSummaries(data, TODAY);
    expect(data.listOwnPlannedWork).toHaveBeenCalledWith(TODAY, "2026-11-23");
  });

  it("summarises readiness with crew, site and scenario count", async () => {
    const summaries = await getPlannedWorkSummaries(
      source([record("a", "2026-11-11"), record("bb", "2026-11-12")], 7),
      TODAY,
    );
    expect(summaries).toEqual([
      {
        plannedWorkId: "a",
        workDate: "2026-11-11",
        crewName: "Crew Alpha",
        siteName: "Harbour View",
        scenarioCount: 1,
        state: "ready",
        reliesOnDelivery: false,
      },
      {
        plannedWorkId: "bb",
        workDate: "2026-11-12",
        crewName: "Crew Alpha",
        siteName: "Harbour View",
        scenarioCount: 1,
        state: "short",
        reliesOnDelivery: false,
      },
    ]);
  });

  it("returns nothing when there is no planned work", async () => {
    await expect(getPlannedWorkSummaries(source([], 10), TODAY)).resolves.toEqual([]);
  });

  it("propagates data access errors", async () => {
    const data = source([], 0);
    data.listOwnPlannedWork.mockRejectedValue(new Error("offline"));
    await expect(getPlannedWorkSummaries(data, TODAY)).rejects.toThrow("offline");
  });
});

describe("groupByDate", () => {
  const summary = (id: string, workDate: string): PlannedWorkSummary => ({
    plannedWorkId: id,
    workDate,
    crewName: "c",
    siteName: "s",
    scenarioCount: 1,
    state: "ready",
    reliesOnDelivery: false,
  });

  it("groups by date in date order, keeping item order", () => {
    expect(
      groupByDate([
        summary("c", "2026-11-12"),
        summary("a", "2026-11-11"),
        summary("b", "2026-11-11"),
      ]),
    ).toEqual([
      { date: "2026-11-11", items: [summary("a", "2026-11-11"), summary("b", "2026-11-11")] },
      { date: "2026-11-12", items: [summary("c", "2026-11-12")] },
    ]);
  });

  it("returns no groups for no summaries", () => {
    expect(groupByDate([])).toEqual([]);
  });
});
