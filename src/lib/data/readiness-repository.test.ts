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
  for (const method of ["select", "gte", "lte", "order", "eq", "in"])
    builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function client(tables: Record<string, Result>, rpc: Result = { data: [], error: null }) {
  const from = vi.fn((table: string) => query(tables[table] ?? { data: [], error: null }));
  return { client: { from, rpc: vi.fn(async () => rpc) } as unknown as SupabaseClient, from };
}

const ID = "a0000000-0000-4000-8005-000000000001";

const plannedWorkRow = {
  id: ID,
  work_date: "2026-11-12",
  created_at: "2026-10-01T00:00:00Z",
  crews: { name: "Crew Alpha" },
  sites: { name: "Harbour View" },
  planned_work_items: [
    {
      penetration_count: 6,
      scenarios: {
        id: "s1",
        label: "Risers",
        nominated_solutions: {
          solution_id: "sol1",
          solutions: {
            internal_code: "0798",
            product_requirements: [{ product_id: "collar", quantity_per_penetration: "2.000" }],
          },
        },
      },
    },
    { penetration_count: 2, scenarios: { id: "s2", label: "Ceiling", nominated_solutions: null } },
  ],
};

const expectedRecord = {
  plannedWorkId: ID,
  workDate: "2026-11-12",
  createdAt: "2026-10-01T00:00:00Z",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  scenarios: [
    {
      scenarioId: "s1",
      label: "Risers",
      penetrationCount: 6,
      nominatedSolutionId: "sol1",
      solutionCode: "0798",
      requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
    },
    {
      scenarioId: "s2",
      label: "Ceiling",
      penetrationCount: 2,
      nominatedSolutionId: null,
      solutionCode: null,
      requirements: [],
    },
  ],
};

describe("toPlannedWorkRecord", () => {
  it("maps nested rows, including missing nominated solutions", () => {
    const nominatedItem = {
      penetration_count: 6,
      scenarios: {
        id: "s1",
        label: "Risers",
        nominated_solutions: {
          solution_id: "sol1",
          solutions: {
            internal_code: "0798",
            product_requirements: [{ product_id: "collar", quantity_per_penetration: 2 }],
          },
        },
      },
    };
    const unnominatedItem = {
      penetration_count: 2,
      scenarios: { id: "s2", label: "Ceiling", nominated_solutions: null },
    };
    expect(
      toPlannedWorkRecord({
        ...plannedWorkRow,
        planned_work_items: [nominatedItem, unnominatedItem],
      }),
    ).toEqual(expectedRecord);
  });
});

describe("createSupabaseReadinessDataSource", () => {
  it("lists planned work in the window, coercing numeric strings", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: [plannedWorkRow], error: null } }).client,
    );
    await expect(source.listOwnPlannedWork("2026-11-10", "2026-11-23")).resolves.toEqual([
      expectedRecord,
    ]);
  });

  it("wraps query errors", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: null, error: { message: "boom" } } }).client,
    );
    await expect(source.listOwnPlannedWork("2026-11-10", "2026-11-23")).rejects.toThrowError(
      DataAccessError,
    );
  });

  it("rejects malformed responses", async () => {
    const source = createSupabaseReadinessDataSource(
      client({ planned_work: { data: [{ id: 1 }], error: null } }).client,
    );
    await expect(source.listOwnPlannedWork("2026-11-10", "2026-11-23")).rejects.toThrowError(
      "Could not load planned work",
    );
  });

  describe("getPlannedWork", () => {
    it("returns one planned work", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ planned_work: { data: plannedWorkRow, error: null } }).client,
      );
      await expect(source.getPlannedWork(ID)).resolves.toEqual(expectedRecord);
    });

    it("returns null when it does not exist or cannot be seen", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ planned_work: { data: null, error: null } }).client,
      );
      await expect(source.getPlannedWork(ID)).resolves.toBeNull();
    });

    it("returns null for an id that is not a UUID, without querying", async () => {
      const fake = client({});
      await expect(
        createSupabaseReadinessDataSource(fake.client).getPlannedWork("abc"),
      ).resolves.toBeNull();
      expect(fake.from).not.toHaveBeenCalled();
    });

    it("wraps errors", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ planned_work: { data: null, error: { message: "x" } } }).client,
      );
      await expect(source.getPlannedWork(ID)).rejects.toThrowError(DataAccessError);
    });
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
      ).client,
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
      client({}, { data: null, error: { message: "denied" } }).client,
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
      }).client,
    );
    const supply = await source.getSupply();
    expect([...supply.stock]).toEqual([["collar", 20]]);
    expect(supply.deliveries.map((delivery) => delivery.received)).toEqual([false, true]);
  });

  it.each([
    ["stock", { stock: { data: null, error: { message: "x" } } }],
    ["expected deliveries", { expected_deliveries: { data: null, error: { message: "x" } } }],
  ])("wraps %s errors", async (label, tables) => {
    await expect(
      createSupabaseReadinessDataSource(client(tables).client).getSupply(),
    ).rejects.toThrowError(`Could not load ${label}`);
  });

  describe("getProducts", () => {
    it("loads names and units", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ products: { data: [{ id: "p1", name: "Collar", unit: "each" }], error: null } })
          .client,
      );
      await expect(source.getProducts(["p1"])).resolves.toEqual([
        { id: "p1", name: "Collar", unit: "each" },
      ]);
    });

    it("skips the query for no ids", async () => {
      const fake = client({});
      await expect(createSupabaseReadinessDataSource(fake.client).getProducts([])).resolves.toEqual(
        [],
      );
      expect(fake.from).not.toHaveBeenCalled();
    });

    it("wraps errors", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ products: { data: null, error: { message: "x" } } }).client,
      );
      await expect(source.getProducts(["p1"])).rejects.toThrowError("Could not load products");
    });
  });

  describe("getOpenEscalationId", () => {
    it("returns the open escalation id", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ escalations: { data: { id: "e1" }, error: null } }).client,
      );
      await expect(source.getOpenEscalationId(ID)).resolves.toBe("e1");
    });

    it("returns null when there is none", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ escalations: { data: null, error: null } }).client,
      );
      await expect(source.getOpenEscalationId(ID)).resolves.toBeNull();
    });

    it("wraps errors", async () => {
      const source = createSupabaseReadinessDataSource(
        client({ escalations: { data: null, error: { message: "x" } } }).client,
      );
      await expect(source.getOpenEscalationId(ID)).rejects.toThrowError(
        "Could not load escalations",
      );
    });
  });
});

describe("DataAccessError", () => {
  it("keeps the cause", () => {
    const cause = new Error("network");
    expect(new DataAccessError("stock", cause).cause).toBe(cause);
  });
});
