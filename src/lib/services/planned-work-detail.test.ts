import { describe, expect, it, vi } from "vitest";
import type {
  PlannedWorkDetailSource,
  PlannedWorkRecord,
  ProductRecord,
} from "@/lib/data/readiness-repository";
import { getPlannedWorkDetail } from "./planned-work-detail";

const TODAY = "2026-11-10";

const record: PlannedWorkRecord = {
  plannedWorkId: "pw",
  workDate: "2026-11-12",
  createdAt: "2026-10-01T00:00:00Z",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  scenarios: [
    {
      scenarioId: "s1",
      label: "Risers",
      penetrationCount: 8,
      nominatedSolutionId: "sol1",
      solutionCode: "0798",
      requirements: [
        { productId: "collar", quantityPerPenetration: 2 },
        { productId: "sealant", quantityPerPenetration: 0.1 },
      ],
    },
    {
      scenarioId: "s2",
      label: "Beam",
      penetrationCount: 1,
      nominatedSolutionId: "sol2",
      solutionCode: "0918",
      requirements: [],
    },
    {
      scenarioId: "s3",
      label: "Ceiling",
      penetrationCount: 2,
      nominatedSolutionId: null,
      solutionCode: null,
      requirements: [],
    },
  ],
};

const products: ProductRecord[] = [
  { id: "collar", name: "Collar 50", unit: "each" },
  { id: "sealant", name: "Sealant", unit: "cartridge" },
  { id: "batt", name: "Batt", unit: "each" },
];

function source(overrides: Partial<PlannedWorkDetailSource> = {}): PlannedWorkDetailSource {
  return {
    listOwnPlannedWork: vi.fn(async () => []),
    getPlannedWork: vi.fn(async () => record),
    getAllocationDemand: vi.fn(async () => [
      {
        plannedWorkId: "earlier",
        workDate: "2026-11-11",
        createdAt: "2026-09-01T00:00:00Z",
        productId: "collar",
        quantity: 14,
        isOwn: true,
      },
    ]),
    getSupply: vi.fn(async () => ({
      stock: new Map([
        ["collar", 20],
        ["sealant", 50],
      ]),
      deliveries: [
        {
          id: "d1",
          productId: "collar",
          quantity: 10,
          expectedDate: "2026-11-12",
          received: false,
        },
      ],
    })),
    getProducts: vi.fn(async () => products),
    getOpenEscalationId: vi.fn(async () => null),
    ...overrides,
  };
}

describe("getPlannedWorkDetail", () => {
  it("returns null when the planned work does not exist or cannot be seen", async () => {
    await expect(
      getPlannedWorkDetail(source({ getPlannedWork: vi.fn(async () => null) }), "pw", TODAY),
    ).resolves.toBeNull();
  });

  it("returns null for planned work in the past", async () => {
    const past = source({
      getPlannedWork: vi.fn(async () => ({ ...record, workDate: "2026-11-09" })),
    });
    await expect(getPlannedWorkDetail(past, "pw", TODAY)).resolves.toBeNull();
  });

  it("explains each scenario in plain language", async () => {
    const detail = (await getPlannedWorkDetail(source(), "pw", TODAY))!;
    expect(detail).toMatchObject({
      plannedWorkId: "pw",
      crewName: "Crew Alpha",
      siteName: "Harbour View",
      state: "short",
    });
    expect(detail.scenarios).toEqual([
      {
        scenarioId: "s1",
        label: "Risers",
        penetrationCount: 8,
        solutionCode: "0798",
        state: "short",
        reasons: [
          "Short by 10 × Collar 50",
          "14 already allocated to earlier planned work",
          "Delivery of 10 is due on the work date, so it is not counted",
        ],
      },
      {
        scenarioId: "s2",
        label: "Beam",
        penetrationCount: 1,
        solutionCode: "0918",
        state: "unknown",
        reasons: ["Product quantities unknown for solution 0918"],
      },
      {
        scenarioId: "s3",
        label: "Ceiling",
        penetrationCount: 2,
        solutionCode: null,
        state: "unknown",
        reasons: ["No solution nominated for this scenario"],
      },
    ]);
  });

  it("lists each product with needed, allocated and short, plus notes", async () => {
    const detail = (await getPlannedWorkDetail(source(), "pw", TODAY))!;
    expect(detail.products).toEqual([
      {
        productId: "collar",
        name: "Collar 50",
        unit: "each",
        needed: 16,
        allocated: 6,
        short: 10,
        state: "short",
        notes: [
          "14 already allocated to earlier planned work",
          "Delivery of 10 is due on the work date, so it is not counted",
        ],
      },
      {
        productId: "sealant",
        name: "Sealant",
        unit: "cartridge",
        needed: 1,
        allocated: 1,
        short: 0,
        state: "ready",
        notes: [],
      },
    ]);
  });

  it("offers to escalate when the work is not Ready and nothing is open", async () => {
    expect((await getPlannedWorkDetail(source(), "pw", TODAY))!.escalation).toEqual({
      kind: "escalate",
    });
  });

  it("links to the open escalation when there is one", async () => {
    const withOpen = source({ getOpenEscalationId: vi.fn(async () => "esc-1") });
    expect((await getPlannedWorkDetail(withOpen, "pw", TODAY))!.escalation).toEqual({
      kind: "view",
      escalationId: "esc-1",
    });
  });

  it("offers no escalation for Ready work and notes reliance on deliveries", async () => {
    const ready = source({
      getPlannedWork: vi.fn(async () => ({
        ...record,
        scenarios: [
          {
            ...record.scenarios[0]!,
            requirements: [{ productId: "batt", quantityPerPenetration: 1 }],
          },
        ],
      })),
      getAllocationDemand: vi.fn(async () => []),
      getSupply: vi.fn(async () => ({
        stock: new Map([["batt", 0]]),
        deliveries: [
          {
            id: "d2",
            productId: "batt",
            quantity: 10,
            expectedDate: "2026-11-11",
            received: false,
          },
        ],
      })),
    });
    const detail = (await getPlannedWorkDetail(ready, "pw", TODAY))!;
    expect(detail).toMatchObject({
      state: "ready",
      reliesOnDelivery: true,
      escalation: { kind: "none" },
    });
    expect(detail.products[0]?.notes).toEqual(["Relies on delivery of 8 due Wed 11 Nov"]);
  });

  it("falls back to a generic name for a product it cannot load", async () => {
    const detail = (await getPlannedWorkDetail(
      source({ getProducts: vi.fn(async () => []) }),
      "pw",
      TODAY,
    ))!;
    expect(detail.products[0]).toMatchObject({ name: "Unknown product", unit: "each" });
    expect(detail.scenarios[0]?.reasons[0]).toBe("Short by 10 × an unknown product");
  });

  it("asks for the names of every product mentioned, including ones without stock", async () => {
    const getProducts = vi.fn(async () => products);
    await getPlannedWorkDetail(source({ getProducts }), "pw", TODAY);
    expect(getProducts).toHaveBeenCalledWith(["collar", "sealant"]);
  });
});
