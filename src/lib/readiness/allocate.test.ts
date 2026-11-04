import { describe, expect, it } from "vitest";
import { allocate } from "./allocate";
import {
  InvalidReadinessInputError,
  type DemandLine,
  type ExpectedDeliveryInput,
  type Supply,
} from "./types";

const TODAY = "2026-11-10";
const COLLAR = "collar";
const BATT = "batt";

let sequence = 0;
function demand(
  overrides: Partial<DemandLine> & Pick<DemandLine, "plannedWorkId" | "workDate" | "quantity">,
): DemandLine {
  sequence += 1;
  return {
    productId: COLLAR,
    createdAt: `2026-10-01T00:00:${String(sequence).padStart(2, "0")}Z`,
    isOwn: true,
    ...overrides,
  };
}

function supply(stock: Record<string, number>, deliveries: ExpectedDeliveryInput[] = []): Supply {
  return { stock: new Map(Object.entries(stock)), deliveries };
}

function delivery(
  overrides: Partial<ExpectedDeliveryInput> &
    Pick<ExpectedDeliveryInput, "expectedDate" | "quantity">,
) {
  return { id: `d-${overrides.expectedDate}`, productId: COLLAR, received: false, ...overrides };
}

const byWork = (allocations: ReturnType<typeof allocate>) =>
  Object.fromEntries(allocations.map((allocation) => [allocation.plannedWorkId, allocation]));

describe("allocate", () => {
  it("R1: stock that covers demand exactly leaves nothing short", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-11", quantity: 10 })],
      supply({ collar: 10 }),
      TODAY,
    );
    expect(result).toMatchObject({
      needed: 10,
      fromStock: 10,
      allocated: 10,
      short: 0,
      fromDeliveries: [],
      noStockRecord: false,
    });
  });

  it("R2: zero stock and no deliveries is short by the full demand", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-11", quantity: 7 })],
      supply({ collar: 0 }),
      TODAY,
    );
    expect(result).toMatchObject({ allocated: 0, short: 7 });
  });

  it("R3: one unit below demand is short by 1", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-11", quantity: 10 })],
      supply({ collar: 9 }),
      TODAY,
    );
    expect(result?.short).toBe(1);
  });

  it("R4: earlier planned work takes the stock first", () => {
    const results = byWork(
      allocate(
        [
          demand({ plannedWorkId: "later", workDate: "2026-11-13", quantity: 10 }),
          demand({ plannedWorkId: "earlier", workDate: "2026-11-12", quantity: 10 }),
        ],
        supply({ collar: 15 }),
        TODAY,
      ),
    );
    expect(results.earlier).toMatchObject({ allocated: 10, short: 0, allocatedToEarlier: 0 });
    expect(results.later).toMatchObject({ allocated: 5, short: 5, allocatedToEarlier: 10 });
  });

  it("R5: on the same date, the earlier-created planned work is allocated first", () => {
    const first = demand({
      plannedWorkId: "z-created-first",
      workDate: "2026-11-12",
      quantity: 10,
      createdAt: "2026-10-01T08:00:00Z",
    });
    const second = demand({
      plannedWorkId: "a-created-second",
      workDate: "2026-11-12",
      quantity: 10,
      createdAt: "2026-10-01T09:00:00Z",
    });
    const results = byWork(allocate([second, first], supply({ collar: 10 }), TODAY));
    expect(results["z-created-first"]?.short).toBe(0);
    expect(results["a-created-second"]?.short).toBe(10);
  });

  it("falls back to planned work id when date and creation time are equal", () => {
    const createdAt = "2026-10-01T08:00:00Z";
    const results = byWork(
      allocate(
        [
          demand({ plannedWorkId: "b", workDate: "2026-11-12", quantity: 10, createdAt }),
          demand({ plannedWorkId: "a", workDate: "2026-11-12", quantity: 10, createdAt }),
        ],
        supply({ collar: 10 }),
        TODAY,
      ),
    );
    expect(results.a?.short).toBe(0);
    expect(results.b?.short).toBe(10);
  });

  it("R6: a delivery due the day before the work counts and is recorded", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 8 })],
      supply({ collar: 0 }, [delivery({ expectedDate: "2026-11-14", quantity: 10 })]),
      TODAY,
    );
    expect(result).toMatchObject({
      fromStock: 0,
      fromDeliveries: [{ deliveryId: "d-2026-11-14", expectedDate: "2026-11-14", quantity: 8 }],
      allocated: 8,
      short: 0,
    });
  });

  it("R7: a delivery due on the work date does not count, and is reported", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 8 })],
      supply({ collar: 0 }, [delivery({ expectedDate: "2026-11-15", quantity: 10 })]),
      TODAY,
    );
    expect(result).toMatchObject({ allocated: 0, short: 8, dueSameDay: 10, fromDeliveries: [] });
  });

  it("does not count a delivery due after the work date", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 8 })],
      supply({ collar: 0 }, [delivery({ expectedDate: "2026-11-20", quantity: 10 })]),
      TODAY,
    );
    expect(result).toMatchObject({ short: 8, dueSameDay: 0, overdue: 0 });
  });

  it("R8: an overdue, unreceived delivery does not count, and is reported", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 4 })],
      supply({ collar: 1 }, [delivery({ expectedDate: "2026-11-08", quantity: 5 })]),
      TODAY,
    );
    expect(result).toMatchObject({ fromStock: 1, allocated: 1, short: 3, overdue: 5 });
  });

  it("counts a delivery due today for planned work after today", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-11", quantity: 5 })],
      supply({ collar: 0 }, [delivery({ expectedDate: TODAY, quantity: 5 })]),
      TODAY,
    );
    expect(result?.short).toBe(0);
  });

  it("R9: a received delivery is ignored (it is already in stock)", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 5 })],
      supply({ collar: 5 }, [
        delivery({ expectedDate: "2026-11-12", quantity: 10, received: true }),
      ]),
      TODAY,
    );
    expect(result).toMatchObject({ fromStock: 5, fromDeliveries: [], overdue: 0 });
  });

  it("R10 and R11: planned work before today is excluded; today's is included", () => {
    const results = byWork(
      allocate(
        [
          demand({ plannedWorkId: "yesterday", workDate: "2026-11-09", quantity: 10 }),
          demand({ plannedWorkId: "today", workDate: TODAY, quantity: 10 }),
        ],
        supply({ collar: 10 }),
        TODAY,
      ),
    );
    expect(results.yesterday).toBeUndefined();
    expect(results.today).toMatchObject({ allocated: 10, short: 0 });
  });

  it("uses stock before deliveries, and the earliest delivery first", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-20", quantity: 12 })],
      supply({ collar: 4 }, [
        delivery({ id: "late", expectedDate: "2026-11-18", quantity: 10 }),
        delivery({ id: "early", expectedDate: "2026-11-12", quantity: 5 }),
      ]),
      TODAY,
    );
    expect(result?.fromStock).toBe(4);
    expect(result?.fromDeliveries).toEqual([
      { deliveryId: "early", expectedDate: "2026-11-12", quantity: 5 },
      { deliveryId: "late", expectedDate: "2026-11-18", quantity: 3 },
    ]);
  });

  it("matches the spec's worked example (AC-4 worked examples)", () => {
    const pieces = [
      demand({ plannedWorkId: "crewA-tue", workDate: "2026-11-17", quantity: 10 }),
      demand({ plannedWorkId: "crewB-thu", workDate: "2026-11-19", quantity: 10 }),
    ];
    const wednesday = byWork(
      allocate(
        pieces,
        supply({ collar: 15 }, [delivery({ expectedDate: "2026-11-18", quantity: 8 })]),
        TODAY,
      ),
    );
    expect(wednesday["crewA-tue"]).toMatchObject({ fromStock: 10, short: 0 });
    expect(wednesday["crewB-thu"]).toMatchObject({ fromStock: 5, short: 0 });
    expect(wednesday["crewB-thu"]?.fromDeliveries[0]?.quantity).toBe(5);

    const thursday = byWork(
      allocate(
        pieces,
        supply({ collar: 15 }, [delivery({ expectedDate: "2026-11-19", quantity: 8 })]),
        TODAY,
      ),
    );
    expect(thursday["crewB-thu"]).toMatchObject({
      allocated: 5,
      short: 5,
      allocatedToEarlier: 10,
      dueSameDay: 8,
    });
  });

  it("reports a missing stock record instead of allocating", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 3, productId: BATT })],
      supply({ collar: 10 }, [
        delivery({ productId: BATT, expectedDate: "2026-11-12", quantity: 10 }),
      ]),
      TODAY,
    );
    expect(result).toMatchObject({
      noStockRecord: true,
      allocated: 0,
      short: 3,
      fromDeliveries: [],
    });
  });

  it("reports a missing stock record for a product absent from supply entirely", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 3, productId: "ghost" })],
      supply({}),
      TODAY,
    );
    expect(result).toMatchObject({ noStockRecord: true, allocatedToEarlier: 0 });
  });

  it("keeps products independent", () => {
    const results = allocate(
      [
        demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 10, productId: COLLAR }),
        demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 2, productId: BATT }),
      ],
      supply({ collar: 10, batt: 1 }),
      TODAY,
    );
    expect(results.map((result) => [result.productId, result.short])).toEqual([
      [COLLAR, 0],
      [BATT, 1],
    ]);
  });

  it("handles zero demand", () => {
    const [result] = allocate(
      [demand({ plannedWorkId: "A", workDate: "2026-11-15", quantity: 0 })],
      supply({ collar: 0 }),
      TODAY,
    );
    expect(result).toMatchObject({ allocated: 0, short: 0 });
  });

  it("returns nothing for no demand", () => {
    expect(allocate([], supply({ collar: 5 }), TODAY)).toEqual([]);
  });

  it("R20: the same input in a different order gives identical output", () => {
    const lines = [
      demand({ plannedWorkId: "A", workDate: "2026-11-12", quantity: 6 }),
      demand({ plannedWorkId: "B", workDate: "2026-11-14", quantity: 6 }),
      demand({ plannedWorkId: "C", workDate: "2026-11-13", quantity: 6 }),
    ];
    const deliveries = [
      delivery({ id: "x", expectedDate: "2026-11-12", quantity: 4 }),
      delivery({ id: "y", expectedDate: "2026-11-12", quantity: 4 }),
    ];
    const forward = allocate(lines, supply({ collar: 5 }, deliveries), TODAY);
    const reversed = allocate(
      [...lines].reverse(),
      supply({ collar: 5 }, [...deliveries].reverse()),
      TODAY,
    );
    expect(reversed).toEqual(forward);
  });

  it("does not mutate its input", () => {
    const lines = [demand({ plannedWorkId: "A", workDate: "2026-11-12", quantity: 6 })];
    const input = supply({ collar: 5 }, [delivery({ expectedDate: "2026-11-11", quantity: 4 })]);
    const snapshot = JSON.stringify({
      lines,
      stock: [...input.stock],
      deliveries: input.deliveries,
    });
    allocate(lines, input, TODAY);
    expect(JSON.stringify({ lines, stock: [...input.stock], deliveries: input.deliveries })).toBe(
      snapshot,
    );
  });

  it("R21: allocates 1,000 planned works × 12 products quickly", () => {
    const products = Array.from({ length: 12 }, (_, index) => `p${index}`);
    const lines: DemandLine[] = [];
    for (let work = 0; work < 1000; work += 1) {
      const day = String(11 + (work % 18)).padStart(2, "0");
      for (const productId of products) {
        lines.push(
          demand({ plannedWorkId: `w${work}`, workDate: `2026-11-${day}`, quantity: 3, productId }),
        );
      }
    }
    const stock = Object.fromEntries(products.map((productId) => [productId, 1500]));
    const results = allocate(lines, supply(stock), TODAY);
    expect(results).toHaveLength(12_000);
    expect(results.reduce((sum, result) => sum + result.allocated, 0)).toBe(12 * 1500);

    // The first call above also warms up the JIT. Judge speed on the fastest of several runs so
    // a single noisy measurement on a shared CI runner cannot fail the < 100 ms budget.
    const timings = Array.from({ length: 5 }, () => {
      const started = performance.now();
      allocate(lines, supply(stock), TODAY);
      return performance.now() - started;
    });
    expect(Math.min(...timings)).toBeLessThan(100);
  });

  describe("invalid input (R22)", () => {
    it.each([
      ["a negative stock level", supply({ collar: -1 })],
      ["a fractional stock level", supply({ collar: 1.5 })],
      [
        "a delivery with zero quantity",
        supply({ collar: 1 }, [delivery({ expectedDate: "2026-11-12", quantity: 0 })]),
      ],
      [
        "a delivery with an invalid date",
        supply({ collar: 1 }, [delivery({ expectedDate: "12/11/2026", quantity: 1 })]),
      ],
    ])("rejects %s", (_label, badSupply) => {
      expect(() => allocate([], badSupply, TODAY)).toThrowError(InvalidReadinessInputError);
    });

    it.each([-1, 1.5, Number.NaN])("rejects a demand quantity of %s", (quantity) => {
      expect(() =>
        allocate(
          [demand({ plannedWorkId: "A", workDate: "2026-11-12", quantity })],
          supply({ collar: 1 }),
          TODAY,
        ),
      ).toThrowError(InvalidReadinessInputError);
    });

    it.each(["2026-11-31", "2026-13-01", "tomorrow", ""])("rejects the date %j", (date) => {
      expect(() => allocate([], supply({}), date)).toThrowError(/YYYY-MM-DD/);
      expect(() =>
        allocate([demand({ plannedWorkId: "A", workDate: date, quantity: 1 })], supply({}), TODAY),
      ).toThrowError(/YYYY-MM-DD/);
    });
  });
});
