import { beforeAll, describe, expect, it } from "vitest";
import {
  createSupabaseReadinessDataSource,
  type PlannedWorkDetailSource,
} from "@/lib/data/readiness-repository";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "@/lib/sample-data/site";
import { getPlannedWorkDetail } from "@/lib/services/planned-work-detail";
import { getPlannedWorkSummaries } from "@/lib/services/planned-work-summaries";
import { admin, createPersona, isoDate, signInAsDemo } from "./support";

const teamLeader = SAMPLE_PERSONAS.find((persona) => persona.role === "team_leader")!;
let source: PlannedWorkDetailSource;

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

describe("planned work detail from the database", () => {
  const pw = (key: string) => SAMPLE_PLANNED_WORK.find((work) => work.key === key)!;

  it("explains why PW3 is short, in plain language", async () => {
    const detail = await getPlannedWorkDetail(source, pw("PW3").id, isoDate(0));
    expect(detail?.state).toBe("short");
    expect(detail?.scenarios[0]?.reasons).toEqual([
      "Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)",
      "14 already allocated to earlier planned work",
      "Delivery of 10 is due on the work date, so it is not counted",
    ]);
    expect(detail?.escalation).toEqual({ kind: "escalate" });
  });

  it("names the solution that has no product requirement", async () => {
    const detail = await getPlannedWorkDetail(source, pw("PW5").id, isoDate(0));
    expect(detail?.scenarios.flatMap((scenario) => scenario.reasons)).toContain(
      "Product quantities unknown for solution 0918",
    );
  });

  it("offers no escalation for Ready work", async () => {
    const detail = await getPlannedWorkDetail(source, pw("PW1").id, isoDate(0));
    expect(detail?.escalation).toEqual({ kind: "none" });
  });

  it("treats past planned work as not found", async () => {
    await expect(getPlannedWorkDetail(source, pw("PW0").id, isoDate(0))).resolves.toBeNull();
  });

  it("hides the planned work from another team leader", async () => {
    const stranger = await createPersona("team_leader", "Unrelated leader");
    try {
      const strangerSource = createSupabaseReadinessDataSource(stranger.client);
      await expect(
        getPlannedWorkDetail(strangerSource, pw("PW3").id, isoDate(0)),
      ).resolves.toBeNull();
    } finally {
      await admin.auth.admin.deleteUser(stranger.id);
    }
  });
});
