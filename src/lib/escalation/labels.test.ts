import { describe, expect, it } from "vitest";
import { RESOLUTION_LABELS, describeStoredLine } from "./labels";

describe("describeStoredLine", () => {
  it.each([
    [
      {
        productName: "Collar",
        unit: "each" as const,
        quantityShort: 10,
        reason: "shortage" as const,
      },
      "Short by 10 × Collar",
    ],
    [
      {
        productName: "Wrap",
        unit: "metre" as const,
        quantityShort: 2,
        reason: "shortage" as const,
      },
      "Short by 2 m of Wrap",
    ],
    [
      { productName: null, unit: null, quantityShort: 2, reason: "shortage" as const },
      "A product is short",
    ],
    [
      {
        productName: "Collar 65",
        unit: "each" as const,
        quantityShort: null,
        reason: "no_stock_record" as const,
      },
      "No stock record for Collar 65",
    ],
    [
      { productName: null, unit: null, quantityShort: null, reason: "no_stock_record" as const },
      "A product has no stock record",
    ],
    [
      {
        productName: null,
        unit: null,
        quantityShort: null,
        reason: "no_nominated_solution" as const,
      },
      "A scenario has no nominated solution",
    ],
    [
      {
        productName: null,
        unit: null,
        quantityShort: null,
        reason: "no_product_requirement" as const,
      },
      "Product quantities are unknown for a nominated solution",
    ],
  ])("describes %o", (line, expected) => {
    expect(describeStoredLine(line)).toBe(expected);
  });
});

describe("RESOLUTION_LABELS", () => {
  it("covers every resolution", () => {
    expect(Object.keys(RESOLUTION_LABELS).sort()).toEqual([
      "different_solution_nominated",
      "planned_work_rescheduled",
      "stock_arriving",
    ]);
  });
});
