// End-to-end check of the pure pipeline against the real catalogue and the SAMPLE site:
// every planned work must produce the readiness its fixture says it should (spec AC-14.4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCatalogue } from "../catalogue/parse";
import { requirementsFor } from "../catalogue/requirement-rules";
import {
  SAMPLE_DELIVERIES,
  SAMPLE_PLANNED_WORK,
  SAMPLE_SCENARIOS,
  SAMPLE_STOCK,
} from "../sample-data/site";
import { computeReadiness, type OwnPlannedWorkInput } from "./compute";
import { plannedWorkReasons, type PlannedWorkReadiness, type Reason } from "./readiness";

const TODAY = "2026-11-10";

function offsetDate(days: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const catalogue = parseCatalogue(readFileSync("docs/solutions-excerpt.csv", "utf8"));
const requirementsByCode = new Map<
  string,
  { productId: string; quantityPerPenetration: number }[]
>();
for (const row of catalogue.flatMap(requirementsFor)) {
  const list = requirementsByCode.get(row.internalCode) ?? [];
  list.push({ productId: row.sku, quantityPerPenetration: row.quantityPerPenetration });
  requirementsByCode.set(row.internalCode, list);
}
const scenarios = new Map(SAMPLE_SCENARIOS.map((scenario) => [scenario.key, scenario]));

const ownPlannedWork: OwnPlannedWorkInput[] = SAMPLE_PLANNED_WORK.map((work, index) => ({
  plannedWorkId: work.key,
  workDate: offsetDate(work.dayOffset),
  createdAt: `2026-10-01T00:${String(index).padStart(2, "0")}:00Z`,
  scenarios: work.items.map((item) => {
    const scenario = scenarios.get(item.scenarioKey)!;
    return {
      scenarioId: scenario.key,
      penetrationCount: item.penetrationCount,
      nominatedSolutionId: scenario.nominatedCode,
      requirements: scenario.nominatedCode
        ? (requirementsByCode.get(scenario.nominatedCode) ?? [])
        : [],
    };
  }),
}));

const results = computeReadiness({
  ownPlannedWork,
  otherDemand: [],
  supply: {
    stock: new Map(SAMPLE_STOCK.map((row) => [row.sku, row.quantity])),
    deliveries: SAMPLE_DELIVERIES.map((delivery) => ({
      id: delivery.id,
      productId: delivery.sku,
      quantity: delivery.quantity,
      expectedDate: offsetDate(delivery.dayOffset),
      received: false,
    })),
  },
  today: TODAY,
});
const byKey = new Map(results.map((result) => [result.plannedWorkId, result]));
const reasonKinds = (result: PlannedWorkReadiness | undefined) =>
  plannedWorkReasons(result!).map((reason: Reason) => reason.kind);

describe("SAMPLE site readiness", () => {
  it.each(
    SAMPLE_PLANNED_WORK.filter((work) => work.expected !== "past").map((work) => [
      work.key,
      work.expected,
      work.note,
    ]),
  )("%s is %s (%s)", (key, expected) => {
    expect(byKey.get(key)?.state).toBe(expected);
  });

  it("excludes past planned work", () => {
    expect(byKey.has("PW0")).toBe(false);
  });

  it("returns planned work in date order", () => {
    expect(results.map((result) => result.plannedWorkId)).toEqual([
      "PW1",
      "PW2",
      "PW3",
      "PW4",
      "PW5",
      "PW6",
      "PW7",
    ]);
  });

  it("PW1 is Ready without relying on a delivery", () => {
    expect(byKey.get("PW1")).toMatchObject({ state: "ready", reliesOnDelivery: false });
  });

  it("PW2 is short of Ø100 collars and wrap, with the wrap delivery overdue", () => {
    const pw2 = byKey.get("PW2")!;
    const short = Object.fromEntries(
      pw2.products.map((product) => [product.productId, product.short]),
    );
    expect(short).toMatchObject({ "SAMPLE-COLLAR-100": 4, "SAMPLE-WRAP-M": 2 });
    expect(reasonKinds(pw2)).toContain("delivery_overdue");
  });

  it("PW3 is short because PW1 took the collars and the delivery is due on the work date", () => {
    expect(reasonKinds(byKey.get("PW3"))).toEqual([
      "shortage",
      "allocated_to_earlier",
      "delivery_due_same_day",
    ]);
    expect(
      byKey.get("PW3")?.products.find((product) => product.productId === "SAMPLE-COLLAR-050"),
    ).toMatchObject({
      needed: 16,
      allocated: 6,
      short: 10,
    });
  });

  it("PW4 is Ready but relies on the batt delivery", () => {
    expect(byKey.get("PW4")).toMatchObject({ state: "ready", reliesOnDelivery: true });
  });

  it("PW5 is Unknown because the timber beam has no product requirement", () => {
    expect(reasonKinds(byKey.get("PW5"))).toEqual(["no_product_requirement"]);
  });

  it("PW6 is Unknown for a missing nominated solution and a missing stock record", () => {
    expect(reasonKinds(byKey.get("PW6"))).toEqual(["no_nominated_solution", "no_stock_record"]);
  });

  it("PW7 is short of wrap with the delivery overdue", () => {
    expect(reasonKinds(byKey.get("PW7"))).toEqual(["shortage", "delivery_overdue"]);
  });
});

describe("computeReadiness with other crews", () => {
  it("orders the user's planned work on the same date by creation time", () => {
    const sameDay = (id: string, createdAt: string): OwnPlannedWorkInput => ({
      plannedWorkId: id,
      workDate: offsetDate(1),
      createdAt,
      scenarios: [],
    });
    const ordered = computeReadiness({
      ownPlannedWork: [
        sameDay("second", "2026-10-02T00:00:00Z"),
        sameDay("first", "2026-10-01T00:00:00Z"),
      ],
      otherDemand: [],
      supply: { stock: new Map(), deliveries: [] },
      today: TODAY,
    });
    expect(ordered.map((result) => result.plannedWorkId)).toEqual(["first", "second"]);
  });

  it("lets earlier planned work from another crew take supply first, without exposing its details", () => {
    const [mine] = computeReadiness({
      ownPlannedWork: [ownPlannedWork[1]!],
      otherDemand: [
        {
          plannedWorkId: "other-crew",
          workDate: offsetDate(0),
          createdAt: "2026-09-01T00:00:00Z",
          productId: "SAMPLE-COLLAR-050",
          quantity: 15,
          isOwn: false,
        },
      ],
      supply: {
        stock: new Map([
          ["SAMPLE-COLLAR-050", 20],
          ["SAMPLE-SEALANT-310", 50],
        ]),
        deliveries: [],
      },
      today: TODAY,
    });
    expect(mine?.state).toBe("short");
    expect(plannedWorkReasons(mine!)).toContainEqual({
      kind: "allocated_to_earlier",
      productId: "SAMPLE-COLLAR-050",
      quantity: 15,
    });
  });

  it("ignores other-demand rows that duplicate the user's own planned work", () => {
    const [mine] = computeReadiness({
      ownPlannedWork: [ownPlannedWork[1]!],
      otherDemand: [
        {
          plannedWorkId: "PW1",
          workDate: offsetDate(1),
          createdAt: "2026-09-01T00:00:00Z",
          productId: "SAMPLE-COLLAR-050",
          quantity: 14,
          isOwn: true,
        },
      ],
      supply: {
        stock: new Map([
          ["SAMPLE-COLLAR-050", 20],
          ["SAMPLE-SEALANT-310", 50],
        ]),
        deliveries: [],
      },
      today: TODAY,
    });
    expect(mine?.state).toBe("ready");
  });
});
