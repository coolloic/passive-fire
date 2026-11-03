import { describe, expect, it } from "vitest";
import { describeReason, describeReliance, formatQuantity, type ProductLabel } from "./describe";
import type { Reason } from "./readiness";

const products: Record<string, ProductLabel> = {
  collar: { name: "Intumescent pipe collar 50 mm (SAMPLE)", unit: "each" },
  wrap: { name: "Intumescent pipe wrap (SAMPLE)", unit: "metre" },
  sealant: { name: "Fire-rated acrylic sealant 310 ml (SAMPLE)", unit: "cartridge" },
};
const lookup = (id: string) => products[id];

describe("formatQuantity", () => {
  it.each([
    [10, products.collar!, "10 × Intumescent pipe collar 50 mm (SAMPLE)"],
    [2, products.wrap!, "2 m of Intumescent pipe wrap (SAMPLE)"],
    [3, products.sealant!, "3 × Fire-rated acrylic sealant 310 ml (SAMPLE)"],
  ])("formats %d of %o", (quantity, product, expected) => {
    expect(formatQuantity(quantity, product)).toBe(expected);
  });
});

describe("describeReason", () => {
  it.each<[Reason, string]>([
    [
      { kind: "shortage", productId: "collar", quantity: 10 },
      "Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)",
    ],
    [
      { kind: "shortage", productId: "wrap", quantity: 2 },
      "Short by 2 m of Intumescent pipe wrap (SAMPLE)",
    ],
    [
      { kind: "allocated_to_earlier", productId: "collar", quantity: 14 },
      "14 already allocated to earlier planned work",
    ],
    [
      { kind: "delivery_due_same_day", productId: "collar", quantity: 10 },
      "Delivery of 10 is due on the work date, so it is not counted",
    ],
    [
      { kind: "delivery_overdue", productId: "wrap", quantity: 5 },
      "Delivery of 5 is overdue, so it is not counted",
    ],
    [
      { kind: "no_stock_record", productId: "collar" },
      "No stock record for Intumescent pipe collar 50 mm (SAMPLE)",
    ],
    [{ kind: "no_nominated_solution" }, "No solution nominated for this scenario"],
    [{ kind: "no_scenarios" }, "No scenarios are planned for this work"],
  ])("describes %o", (reason, expected) => {
    expect(describeReason(reason, lookup)).toBe(expected);
  });

  it("names the solution code when it is known", () => {
    const reason: Reason = { kind: "no_product_requirement", solutionId: "sol-uuid" };
    expect(describeReason(reason, lookup, new Map([["sol-uuid", "0918"]]))).toBe(
      "Product quantities unknown for solution 0918",
    );
    expect(describeReason(reason, lookup)).toBe(
      "Product quantities unknown for the nominated solution",
    );
  });

  it("copes with a product it cannot name", () => {
    expect(describeReason({ kind: "no_stock_record", productId: "ghost" }, lookup)).toBe(
      "No stock record for an unknown product",
    );
  });
});

describe("describeReliance", () => {
  it("names the quantity and date", () => {
    expect(describeReliance({ productId: "batt", expectedDate: "2026-11-08", quantity: 8 })).toBe(
      "Relies on delivery of 8 due Sun 8 Nov",
    );
  });
});
