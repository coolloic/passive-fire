import { beforeAll, describe, expect, it } from "vitest";
import {
  createSupabaseReadinessDataSource,
  type ReadinessDataSource,
} from "@/lib/data/readiness-repository";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "@/lib/sample-data/site";
import { getPlannedWorkSummaries } from "@/lib/services/planned-work-summaries";
import { isoDate, signInAsDemo } from "./support";

const teamLeader = SAMPLE_PERSONAS.find((persona) => persona.role === "team_leader")!;
let source: ReadinessDataSource;

beforeAll(async () => {
  source = createSupabaseReadinessDataSource(await signInAsDemo(teamLeader.email));
});

describe("Supabase readiness data source", () => {
  it("lists the team leader's planned work in the window with nested scenarios", async () => {
    const records = await source.listOwnPlannedWork(isoDate(0), isoDate(13));
    expect(records.map((record) => record.workDate)).toEqual(
      SAMPLE_PLANNED_WORK.filter((work) => work.dayOffset >= 0).map((work) =>
        isoDate(work.dayOffset),
      ),
    );
    const pw1 = records.find((record) => record.workDate === isoDate(1))!;
    expect(pw1).toMatchObject({
      crewName: "Crew Alpha (SAMPLE)",
      siteName: "Harbour View Apartments (SAMPLE)",
    });
    expect(pw1.scenarios).toHaveLength(3);
    expect(pw1.scenarios.every((scenario) => scenario.requirements.length > 0)).toBe(true);
  });

  it("returns null nominated solutions and empty requirements where they are missing", async () => {
    const records = await source.listOwnPlannedWork(isoDate(0), isoDate(13));
    const pw6 = records.find((record) => record.workDate === isoDate(9))!;
    expect(pw6.scenarios.some((scenario) => scenario.nominatedSolutionId === null)).toBe(true);
    const pw5 = records.find((record) => record.workDate === isoDate(7))!;
    expect(
      pw5.scenarios.some(
        (scenario) => scenario.nominatedSolutionId && scenario.requirements.length === 0,
      ),
    ).toBe(true);
  });

  it("loads supply and demand", async () => {
    const supply = await source.getSupply();
    expect(supply.stock.size).toBe(8);
    expect(supply.deliveries).toHaveLength(4);
    const demand = await source.getAllocationDemand(isoDate(0));
    expect(demand.every((line) => Number.isInteger(line.quantity))).toBe(true);
  });

  it("produces the expected readiness for every SAMPLE planned work end to end", async () => {
    const summaries = await getPlannedWorkSummaries(source, isoDate(0));
    const expected = SAMPLE_PLANNED_WORK.filter((work) => work.expected !== "past").map(
      (work) => work.expected,
    );
    expect(summaries.map((summary) => summary.state)).toEqual(expected);
    expect(summaries.find((summary) => summary.workDate === isoDate(5))?.reliesOnDelivery).toBe(
      true,
    );
  });
});
