import { describe, expect, it } from "vitest";
import {
  deriveReadiness,
  plannedWorkReasons,
  worstState,
  type PlannedWorkInput,
  type ScenarioInput,
} from "./readiness";
import { InvalidReadinessInputError, type Allocation } from "./types";

const PW = "PW1";

function allocation(productId: string, overrides: Partial<Allocation> = {}): Allocation {
  return {
    plannedWorkId: PW,
    productId,
    workDate: "2026-11-12",
    isOwn: true,
    needed: 10,
    fromStock: 10,
    fromDeliveries: [],
    allocated: 10,
    short: 0,
    noStockRecord: false,
    allocatedToEarlier: 0,
    dueSameDay: 0,
    overdue: 0,
    ...overrides,
  };
}

function scenario(
  id: string,
  productIds: string[],
  overrides: Partial<ScenarioInput> = {},
): ScenarioInput {
  return {
    scenarioId: id,
    penetrationCount: 5,
    nominatedSolutionId: `sol-${id}`,
    requirements: productIds.map((productId) => ({ productId, quantityPerPenetration: 1 })),
    ...overrides,
  };
}

const work = (scenarios: ScenarioInput[]): PlannedWorkInput => ({
  plannedWorkId: PW,
  workDate: "2026-11-12",
  scenarios,
});

describe("worstState", () => {
  it.each([
    [[], "ready"],
    [["ready", "ready"], "ready"],
    [["ready", "unknown"], "unknown"],
    [["unknown", "short", "ready"], "short"],
  ] as const)("combines %j into %s", (states, expected) => {
    expect(worstState(states)).toBe(expected);
  });
});

describe("deriveReadiness", () => {
  it("is Ready when every product is fully allocated", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar", "sealant"])]), [
      allocation("collar"),
      allocation("sealant"),
    ]);
    expect(result).toMatchObject({ state: "ready", reliesOnDelivery: false });
    expect(result.scenarios[0]).toMatchObject({ state: "ready", reasons: [] });
    expect(result.products.map((product) => product.state)).toEqual(["ready", "ready"]);
  });

  it("flags Ready work that relies on a delivery, with the delivery date", () => {
    const result = deriveReadiness(work([scenario("S1", ["batt"])]), [
      allocation("batt", {
        fromStock: 0,
        fromDeliveries: [{ deliveryId: "d1", expectedDate: "2026-11-11", quantity: 10 }],
      }),
    ]);
    expect(result.state).toBe("ready");
    expect(result.reliesOnDelivery).toBe(true);
    expect(result.products[0]?.reliesOnDeliveries).toEqual([
      { productId: "batt", expectedDate: "2026-11-11", quantity: 10 },
    ]);
  });

  it("is Short with the shortage quantity, and every contributing reason", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar"])]), [
      allocation("collar", {
        allocated: 6,
        short: 10,
        needed: 16,
        allocatedToEarlier: 14,
        dueSameDay: 10,
        overdue: 3,
      }),
    ]);
    expect(result.state).toBe("short");
    expect(result.scenarios[0]?.reasons).toEqual([
      { kind: "shortage", productId: "collar", quantity: 10 },
      { kind: "allocated_to_earlier", productId: "collar", quantity: 14 },
      { kind: "delivery_due_same_day", productId: "collar", quantity: 10 },
      { kind: "delivery_overdue", productId: "collar", quantity: 3 },
    ]);
    expect(result.products[0]).toMatchObject({ needed: 16, allocated: 6, short: 10 });
  });

  it("reports only the shortage when nothing else explains it", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar"])]), [
      allocation("collar", { allocated: 6, short: 4 }),
    ]);
    expect(result.scenarios[0]?.reasons).toEqual([
      { kind: "shortage", productId: "collar", quantity: 4 },
    ]);
  });

  it("R14: is Unknown when a scenario has no nominated solution", () => {
    const result = deriveReadiness(work([scenario("S1", [], { nominatedSolutionId: null })]), []);
    expect(result.state).toBe("unknown");
    expect(result.scenarios[0]?.reasons).toEqual([{ kind: "no_nominated_solution" }]);
  });

  it("R15: is Unknown when the nominated solution has no product requirement", () => {
    const result = deriveReadiness(work([scenario("S9", [])]), []);
    expect(result.state).toBe("unknown");
    expect(result.scenarios[0]?.reasons).toEqual([
      { kind: "no_product_requirement", solutionId: "sol-S9" },
    ]);
  });

  it("R16: is Unknown when a product has no stock record", () => {
    const result = deriveReadiness(work([scenario("S11", ["collar65"])]), [
      allocation("collar65", { noStockRecord: true, allocated: 0, short: 3, fromStock: 0 }),
    ]);
    expect(result.state).toBe("unknown");
    expect(result.scenarios[0]?.reasons).toEqual([
      { kind: "no_stock_record", productId: "collar65" },
    ]);
  });

  it("R17: Short outranks Unknown across scenarios", () => {
    const result = deriveReadiness(
      work([scenario("S1", ["collar"]), scenario("S2", [], { nominatedSolutionId: null })]),
      [allocation("collar", { short: 2, allocated: 8 })],
    );
    expect(result.state).toBe("short");
  });

  it("R17: Short outranks Unknown within one scenario", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar", "ghost"])]), [
      allocation("collar", { short: 2, allocated: 8 }),
      allocation("ghost", { noStockRecord: true }),
    ]);
    expect(result.scenarios[0]?.state).toBe("short");
  });

  it("R18: Unknown with everything else Ready is never Ready", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar"]), scenario("S9", [])]), [
      allocation("collar"),
    ]);
    expect(result.state).toBe("unknown");
  });

  it("R19: planned work with no scenarios is Unknown", () => {
    const result = deriveReadiness(work([]), []);
    expect(result.state).toBe("unknown");
    expect(plannedWorkReasons(result)).toEqual([{ kind: "no_scenarios" }]);
  });

  it("marks every scenario that shares a short product as Short", () => {
    const result = deriveReadiness(
      work([scenario("S1", ["sealant"]), scenario("S2", ["sealant", "collar"])]),
      [allocation("sealant", { short: 1, allocated: 9 }), allocation("collar")],
    );
    expect(result.scenarios.map((entry) => entry.state)).toEqual(["short", "short"]);
  });

  it("ignores allocations for other planned work and products no scenario uses", () => {
    const result = deriveReadiness(work([scenario("S1", ["collar"])]), [
      allocation("collar"),
      allocation("collar", { plannedWorkId: "other", short: 10, allocated: 0 }),
      allocation("unused"),
    ]);
    expect(result.state).toBe("ready");
    expect(result.products.map((product) => product.productId)).toEqual(["collar"]);
  });

  it("lists each product once even when several scenarios use it", () => {
    const result = deriveReadiness(work([scenario("S1", ["sealant", "sealant"])]), [
      allocation("sealant"),
    ]);
    expect(result.scenarios[0]?.productIds).toEqual(["sealant"]);
  });

  it("throws when a required product has no allocation", () => {
    expect(() => deriveReadiness(work([scenario("S1", ["collar"])]), [])).toThrowError(
      InvalidReadinessInputError,
    );
  });
});

describe("plannedWorkReasons", () => {
  it("collects reasons across scenarios without duplicates", () => {
    const result = deriveReadiness(
      work([
        scenario("S1", ["sealant"]),
        scenario("S2", ["sealant"]),
        scenario("S3", [], { nominatedSolutionId: null }),
      ]),
      [allocation("sealant", { short: 1, allocated: 9 })],
    );
    expect(plannedWorkReasons(result)).toEqual([
      { kind: "shortage", productId: "sealant", quantity: 1 },
      { kind: "no_nominated_solution" },
    ]);
  });
});
