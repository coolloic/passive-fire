import { describe, expect, it } from "vitest";
import { computeDemand, demandFromRows, type PlannedWorkDemandInput } from "./demand";
import { InvalidReadinessInputError } from "./types";

const work = (items: PlannedWorkDemandInput["items"]): PlannedWorkDemandInput => ({
  plannedWorkId: "PW1",
  workDate: "2026-11-12",
  createdAt: "2026-10-01T00:00:00Z",
  isOwn: true,
  items,
});

describe("computeDemand", () => {
  it("multiplies penetrations by quantity per penetration", () => {
    expect(
      computeDemand([
        work([
          {
            penetrationCount: 6,
            requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
          },
        ]),
      ]),
    ).toEqual([
      {
        plannedWorkId: "PW1",
        workDate: "2026-11-12",
        createdAt: "2026-10-01T00:00:00Z",
        productId: "collar",
        quantity: 12,
        isOwn: true,
      },
    ]);
  });

  it("R12: sums a product across scenarios before rounding up once", () => {
    const [line] = computeDemand([
      work([
        {
          penetrationCount: 7,
          requirements: [{ productId: "sealant", quantityPerPenetration: 0.1 }],
        },
        {
          penetrationCount: 7,
          requirements: [{ productId: "sealant", quantityPerPenetration: 0.1 }],
        },
      ]),
    ]);
    expect(line?.quantity).toBe(2);
  });

  it("R13: rounds up per planned work, not per scenario", () => {
    const [line] = computeDemand([
      work([
        {
          penetrationCount: 3,
          requirements: [{ productId: "sealant", quantityPerPenetration: 0.1 }],
        },
        {
          penetrationCount: 4,
          requirements: [{ productId: "sealant", quantityPerPenetration: 0.1 }],
        },
      ]),
    ]);
    expect(line?.quantity).toBe(1);
  });

  it("is not tipped over a whole unit by floating-point noise", () => {
    // 25 × 0.28 is 7.000000000000001 in floating point; it must stay 7, not become 8.
    const [product] = computeDemand([
      work([
        {
          penetrationCount: 25,
          requirements: [{ productId: "wrap", quantityPerPenetration: 0.28 }],
        },
      ]),
    ]);
    expect(product?.quantity).toBe(7);

    // Adding 0.1 twenty times (one penetration per scenario) gives 2.0000000000000004; it must stay 2.
    const scenarios = Array.from({ length: 20 }, () => ({
      penetrationCount: 1,
      requirements: [{ productId: "sealant", quantityPerPenetration: 0.1 }],
    }));
    const [sum] = computeDemand([work(scenarios)]);
    expect(sum?.quantity).toBe(2);
  });

  it("keeps products separate and supports several planned works", () => {
    const lines = computeDemand([
      work([
        {
          penetrationCount: 2,
          requirements: [
            { productId: "collar", quantityPerPenetration: 1 },
            { productId: "sealant", quantityPerPenetration: 0.1 },
          ],
        },
      ]),
      {
        ...work([
          {
            penetrationCount: 1,
            requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
          },
        ]),
        plannedWorkId: "PW2",
      },
    ]);
    expect(lines.map((line) => [line.plannedWorkId, line.productId, line.quantity])).toEqual([
      ["PW1", "collar", 2],
      ["PW1", "sealant", 1],
      ["PW2", "collar", 2],
    ]);
  });

  it("produces no lines for scenarios without requirements", () => {
    expect(computeDemand([work([{ penetrationCount: 3, requirements: [] }])])).toEqual([]);
    expect(computeDemand([work([])])).toEqual([]);
    expect(computeDemand([])).toEqual([]);
  });

  it.each([0, -2, 1.5])("R22: rejects a penetration count of %s", (penetrationCount) => {
    expect(() =>
      computeDemand([
        work([
          { penetrationCount, requirements: [{ productId: "collar", quantityPerPenetration: 1 }] },
        ]),
      ]),
    ).toThrowError(InvalidReadinessInputError);
  });

  it.each([-0.1, Number.POSITIVE_INFINITY])(
    "rejects a quantity per penetration of %s",
    (quantityPerPenetration) => {
      expect(() =>
        computeDemand([
          work([
            {
              penetrationCount: 1,
              requirements: [{ productId: "collar", quantityPerPenetration }],
            },
          ]),
        ]),
      ).toThrowError(InvalidReadinessInputError);
    },
  );

  it("rejects an invalid work date", () => {
    expect(() => computeDemand([{ ...work([]), workDate: "next week" }])).toThrowError(
      /YYYY-MM-DD/,
    );
  });
});

describe("demandFromRows", () => {
  const row = {
    planned_work_id: "PW1",
    work_date: "2026-11-12",
    created_at: "2026-10-01T00:00:00Z",
    product_id: "sealant",
    quantity: 1.4,
    is_own: false,
  };

  it("maps database rows and rounds quantities up", () => {
    expect(demandFromRows([row])).toEqual([
      {
        plannedWorkId: "PW1",
        workDate: "2026-11-12",
        createdAt: "2026-10-01T00:00:00Z",
        productId: "sealant",
        quantity: 2,
        isOwn: false,
      },
    ]);
  });

  it("keeps whole quantities as they are", () => {
    expect(demandFromRows([{ ...row, quantity: 14 }])[0]?.quantity).toBe(14);
  });

  it.each([-1, Number.NaN])("rejects a quantity of %s", (quantity) => {
    expect(() => demandFromRows([{ ...row, quantity }])).toThrowError(InvalidReadinessInputError);
  });

  it("rejects an invalid date", () => {
    expect(() => demandFromRows([{ ...row, work_date: "2026-02-30" }])).toThrowError(/YYYY-MM-DD/);
  });
});
