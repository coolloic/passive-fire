import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  DataAccessError,
  createSupabaseReadinessDataSource,
  toPlannedWorkRecord,
} from "./readiness-repository";

type Result = { data: unknown; error: unknown };

/** Fake PostgREST builder: every chained call returns itself; awaiting resolves `result`. */
function query(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "gte", "lte", "order"]) builder[method] = vi.fn(() => builder);
  builder.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function client(
  tables: Record<string, Result>,
  rpc: Result = { data: [], error: null },
): SupabaseClient {
  return {
    from: vi.fn((table: string) => query(tables[table] ?? { data: [], error: null })),
    rpc: vi.fn(async () => rpc),
  } as unknown as SupabaseClient;
}

const plannedWorkRow = {
  id: "pw1",
  work_date: "2026-11-12",
  created_at: "2026-10-01T00:00:00Z",
  crews: { name: "Crew Alpha" },
  sites: { name: "Harbour View" },
  planned_work_items: [
    {
      penetration_count: 6,
      scenarios: {
        id: "s1",
        nominated_solutions: {
          solution_id: "sol1",
          solutions: {
            product_requirements: [{ product_id: "collar", quantity_per_penetration: "2.000" }],
          },
        },
      },
    },
    { penetration_count: 2, scenarios: { id: "s2", nominated_solutions: null } },
  ],
};

describe("toPlannedWorkRecord", () => {
  it("maps nested rows, including missing nominated solutions", () => {
    expect(
      toPlannedWorkRecord({
        ...plannedWorkRow,
        planned_work_items: plannedWorkRow.planned_work_items.map((item) => ({
          ...item,
          scenarios: {
            ...item.scenarios,
            nominated_solutions: item.scenarios.nominated_solutions
              ? {
                  ...item.scenarios.nominated_solutions,
                  solutions: {
                    product_requirements: [{ product_id: "collar", quantity_per_penetration: 2 }],
                  },
                }
              : null,
          },
        })),
      }),
    ).toEqual({
      plannedWorkId: "pw1",
      workDate: "2026-11-12",
      createdAt: "2026-10-01T00:00:00Z",
      crewName: "Crew Alpha",
      siteName: "Harbour View",
      scenarios: [
        {
          scenarioId: "s1",
          penetrationCount: 6,
          nominatedSolutionId: "sol1",
          requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
        },
        { scenarioId: "s2", penetrationCount: 2, nominatedSolutionId: null, requirements: [] },
      ],
    });
  });
});

describe("createSupabaseReadinessDataSource", () => {
  it("lists planned work in the window, coercing numeric strings", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: [plannedWorkRow], error: null } }),
    );
    const [record] = await source.listOwnPlannedWork("2026-11-10", "2026-11-23");
    expect(record?.scenarios[0]?.requirements[0]?.quantityPerPenetration).toBe(2);
  });

  it("wraps query errors", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: null, error: { message: "boom" } } }),
    );
    await expect(source.listOwnPlannedWork("2026-11-10", "2026-11-23")).rejects.toThrowError(
      DataAccessError,
    );
  });

  it("rejects malformed responses", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: [{ id: 1 }], error: null } }),
    );
    await expect(source.listOwnPlannedWork("2026-11-10", "2026-11-23")).rejects.toThrowError(
      "Could not load planned work",
    );
  });

  it("loads allocation demand and rounds it up", async () => {
    const source = createSupabaseReadinessDataSource(
      client(
        {},
        {
          data: [
            {
              planned_work_id: "pw1",
              work_date: "2026-11-12",
              created_at: "x",
              product_id: "seal",
              quantity: "1.4",
              is_own: false,
            },
          ],
          error: null,
        },
      ),
    );
    await expect(source.getAllocationDemand("2026-11-10")).resolves.toEqual([
      {
        plannedWorkId: "pw1",
        workDate: "2026-11-12",
        createdAt: "x",
        productId: "seal",
        quantity: 2,
        isOwn: false,
      },
    ]);
  });

  it("wraps allocation demand errors", async () => {
    const source = createSupabaseReadinessDataSource(
      client({}, { data: null, error: { message: "denied" } }),
    );
    await expect(source.getAllocationDemand("2026-11-10")).rejects.toThrowError(
      "Could not load allocation demand",
    );
  });

  it("loads stock and deliveries", async () => {
    const source = createSupabaseReadinessDataSource(
      client({
        stock: { data: [{ product_id: "collar", quantity: 20 }], error: null },
        expected_deliveries: {
          data: [
            {
              id: "d1",
              product_id: "collar",
              quantity: 10,
              expected_date: "2026-11-13",
              received_at: null,
            },
            {
              id: "d2",
              product_id: "batt",
              quantity: 5,
              expected_date: "2026-11-01",
              received_at: "2026-11-01T10:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );
    const supply = await source.getSupply();
    expect([...supply.stock]).toEqual([["collar", 20]]);
    expect(supply.deliveries).toEqual([
      { id: "d1", productId: "collar", quantity: 10, expectedDate: "2026-11-13", received: false },
      { id: "d2", productId: "batt", quantity: 5, expectedDate: "2026-11-01", received: true },
    ]);
  });

  it.each([
    ["stock", { stock: { data: null, error: { message: "x" } } }],
    ["expected deliveries", { expected_deliveries: { data: null, error: { message: "x" } } }],
  ])("wraps %s errors", async (label, tables) => {
    const source = createSupabaseReadinessDataSource(client(tables));
    await expect(source.getSupply()).rejects.toThrowError(`Could not load ${label}`);
  });
});

describe("DataAccessError", () => {
  it("keeps the cause", () => {
    const cause = new Error("network");
    expect(new DataAccessError("stock", cause).cause).toBe(cause);
  });
});
