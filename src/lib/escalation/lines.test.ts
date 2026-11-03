import { describe, expect, it } from "vitest";
import type {
  PlannedWorkReadiness,
  ProductReadiness,
  ScenarioReadiness,
} from "@/lib/readiness/readiness";
import { escalationLinesFrom } from "./lines";

const product = (
  productId: string,
  overrides: Partial<ProductReadiness> = {},
): ProductReadiness => ({
  productId,
  needed: 10,
  allocated: 10,
  short: 0,
  state: "ready",
  reliesOnDeliveries: [],
  reasons: [],
  ...overrides,
});

const scenario = (reasons: ScenarioReadiness["reasons"]): ScenarioReadiness => ({
  scenarioId: Math.random().toString(),
  state: reasons.length ? "unknown" : "ready",
  productIds: [],
  reasons,
});

const readiness = (
  products: ProductReadiness[],
  scenarios: ScenarioReadiness[] = [],
): PlannedWorkReadiness => ({
  plannedWorkId: "pw",
  workDate: "2026-11-12",
  state: "short",
  reliesOnDelivery: false,
  scenarios,
  products,
});

describe("escalationLinesFrom", () => {
  it("records each short product with its quantity", () => {
    expect(
      escalationLinesFrom(
        readiness([
          product("collar", { short: 4, allocated: 6, state: "short" }),
          product("sealant"),
        ]),
      ),
    ).toEqual([{ productId: "collar", quantityShort: 4, reason: "shortage" }]);
  });

  it("records a missing stock record without a quantity", () => {
    expect(
      escalationLinesFrom(
        readiness([
          product("collar65", {
            short: 3,
            state: "unknown",
            reasons: [{ kind: "no_stock_record", productId: "collar65" }],
          }),
        ]),
      ),
    ).toEqual([{ productId: "collar65", quantityShort: null, reason: "no_stock_record" }]);
  });

  it("records missing nominated solutions and product requirements once each", () => {
    expect(
      escalationLinesFrom(
        readiness(
          [],
          [
            scenario([{ kind: "no_nominated_solution" }]),
            scenario([{ kind: "no_nominated_solution" }]),
            scenario([{ kind: "no_product_requirement", solutionId: "sol" }]),
          ],
        ),
      ),
    ).toEqual([
      { productId: null, quantityShort: null, reason: "no_nominated_solution" },
      { productId: null, quantityShort: null, reason: "no_product_requirement" },
    ]);
  });

  it("ignores product reasons that scenarios repeat", () => {
    expect(
      escalationLinesFrom(
        readiness(
          [
            product("collar", {
              short: 2,
              state: "short",
              reasons: [{ kind: "shortage", productId: "collar", quantity: 2 }],
            }),
          ],
          [scenario([{ kind: "shortage", productId: "collar", quantity: 2 }])],
        ),
      ),
    ).toEqual([{ productId: "collar", quantityShort: 2, reason: "shortage" }]);
  });

  it("returns nothing for Ready work", () => {
    expect(escalationLinesFrom(readiness([product("collar")]))).toEqual([]);
  });
});
