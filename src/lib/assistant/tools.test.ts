import { describe, expect, it, vi } from "vitest";
import type { PlannedWorkDetailSource, PlannedWorkRecord } from "@/lib/data/readiness-repository";
import { createAssistantTools, createToolHandlers } from "./tools";

const TODAY = "2026-11-10";
const PW = "a0000000-0000-4000-8005-000000000003";

const record: PlannedWorkRecord = {
  plannedWorkId: PW,
  workDate: "2026-11-12",
  createdAt: "2026-10-01T00:00:00Z",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  scenarios: [
    {
      scenarioId: "s1",
      label: "Risers",
      penetrationCount: 5,
      nominatedSolutionId: "sol",
      solutionCode: "0798",
      requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
    },
  ],
};

function source(overrides: Partial<PlannedWorkDetailSource> = {}): PlannedWorkDetailSource {
  return {
    listOwnPlannedWork: vi.fn(async () => [record]),
    getPlannedWork: vi.fn(async (id: string) => (id === PW ? record : null)),
    getAllocationDemand: vi.fn(async () => []),
    getSupply: vi.fn(async () => ({
      stock: new Map([["collar", 4]]),
      deliveries: [
        {
          id: "d1",
          productId: "collar",
          quantity: 10,
          expectedDate: "2026-11-08",
          received: false,
        },
        { id: "d2", productId: "collar", quantity: 5, expectedDate: "2026-11-15", received: false },
        { id: "d3", productId: "ghost", quantity: 1, expectedDate: "2026-11-15", received: false },
        { id: "d4", productId: "collar", quantity: 3, expectedDate: "2026-11-01", received: true },
      ],
    })),
    getProducts: vi.fn(async () => [{ id: "collar", name: "Collar 50", unit: "each" as const }]),
    getOpenEscalationId: vi.fn(async () => null),
    ...overrides,
  };
}

const context = (overrides: Partial<PlannedWorkDetailSource> = {}) => ({
  source: source(overrides),
  today: TODAY,
  asOf: "10 Nov, 08:00",
});

describe("assistant tool handlers", () => {
  it("lists planned work with readiness and the data's age", async () => {
    const result = JSON.parse(await createToolHandlers(context()).listPlannedWork());
    expect(result).toEqual({
      asOf: "10 Nov, 08:00",
      plannedWork: [
        {
          plannedWorkId: PW,
          date: "Thu 12 Nov",
          crew: "Crew Alpha",
          site: "Harbour View",
          scenarios: 1,
          readiness: "short",
          reliesOnDelivery: false,
        },
      ],
    });
  });

  it("explains one planned work's readiness with reasons", async () => {
    const result = JSON.parse(await createToolHandlers(context()).getReadiness(PW));
    expect(result).toMatchObject({ date: "Thu 12 Nov", crew: "Crew Alpha", readiness: "short" });
    expect(result.scenarios[0]).toMatchObject({
      label: "Risers",
      nominatedSolution: "0798",
      readiness: "short",
    });
    expect(result.scenarios[0].reasons[0]).toBe("Short by 6 × Collar 50");
  });

  it("lists shortages and what an escalation would record", async () => {
    const result = JSON.parse(await createToolHandlers(context()).getShortages(PW));
    expect(result.products[0]).toMatchObject({
      product: "Collar 50",
      needed: 10,
      allocated: 4,
      short: 6,
    });
    expect(result.escalationWouldRecord).toEqual(["Short by 6 × Collar 50"]);
  });

  it("gives the facts and instructions for drafting an escalation", async () => {
    const result = JSON.parse(await createToolHandlers(context()).draftEscalation(PW));
    expect(result).toMatchObject({
      crew: "Crew Alpha",
      escalationWouldRecord: ["Short by 6 × Collar 50"],
    });
    expect(result.instructions).toContain("the team leader must review it and send it");
  });

  it.each(["getReadiness", "getShortages", "draftEscalation"] as const)(
    "%s reports planned work it cannot see",
    async (name) => {
      const result = JSON.parse(await createToolHandlers(context())[name]("someone-elses"));
      expect(result).toEqual({ error: "No planned work with that id is visible to this user." });
    },
  );

  it("lists unreceived deliveries, flagging overdue ones", async () => {
    const result = JSON.parse(await createToolHandlers(context()).getExpectedDeliveries());
    expect(result.deliveries).toEqual([
      { product: "Collar 50", quantity: 10, expected: "Sun 8 Nov", overdue: true },
      { product: "Collar 50", quantity: 5, expected: "Sun 15 Nov", overdue: false },
      { product: "Unknown product", quantity: 1, expected: "Sun 15 Nov", overdue: false },
    ]);
  });
});

describe("createAssistantTools", () => {
  it("exposes five read-only tools that run the handlers", async () => {
    const tools = createAssistantTools(context());
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_planned_work",
      "get_readiness",
      "get_shortages",
      "draft_escalation",
      "get_expected_deliveries",
    ]);
    // Each tool has its own input type; call them through a plain signature.
    const run = async (name: string, input: object) => {
      const tool = tools.find((candidate) => candidate.name === name) as unknown as {
        run: (input: object) => unknown;
      };
      return JSON.parse(String(await tool.run(input)));
    };
    expect((await run("list_planned_work", {})).plannedWork).toHaveLength(1);
    expect((await run("get_readiness", { plannedWorkId: PW })).readiness).toBe("short");
    expect((await run("get_shortages", { plannedWorkId: PW })).products).toHaveLength(1);
    expect(
      (await run("draft_escalation", { plannedWorkId: PW })).escalationWouldRecord,
    ).toHaveLength(1);
    expect((await run("get_expected_deliveries", {})).deliveries).toHaveLength(3);
  });
});
