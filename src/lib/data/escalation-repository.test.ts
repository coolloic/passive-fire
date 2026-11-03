import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DataAccessError } from "./readiness-repository";
import {
  EscalationForbiddenError,
  createSupabaseEscalationRepository,
  sortForInbox,
} from "./escalation-repository";

type Result = { data: unknown; error: unknown };
const ID = "a0000000-0000-4000-8007-000000000001";

function query(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) builder[method] = vi.fn(() => builder);
  builder.insert = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function client(
  table: Result = { data: [], error: null },
  rpc: Result = { data: [], error: null },
) {
  const rpcFn = vi.fn(async () => rpc);
  const builder = query(table);
  return {
    client: { from: vi.fn(() => builder), rpc: rpcFn } as unknown as SupabaseClient,
    rpcFn,
    builder,
  };
}

const summaryRow = {
  id: ID,
  planned_work_id: "pw",
  state: "open",
  raised_at: "2026-11-03T10:00:00Z",
  resolution: null,
  shortage_cleared_at_sync: false,
  planned_work: {
    work_date: "2026-11-06",
    crews: { name: "Crew Alpha" },
    sites: { name: "Harbour View" },
  },
  raised_by_profile: { display_name: "Sam" },
};

const summary = {
  id: ID,
  plannedWorkId: "pw",
  workDate: "2026-11-06",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  state: "open",
  raisedAt: "2026-11-03T10:00:00Z",
  resolution: null,
  shortageClearedAtSync: false,
  raisedByName: "Sam",
};

describe("raise", () => {
  const input = {
    id: ID,
    plannedWorkId: "pw",
    lines: [{ productId: "collar", quantityShort: 10, reason: "shortage" as const }],
    note: "Need by Friday",
    shortageCleared: false,
  };

  it("calls raise_escalation with snake_case lines and returns the status", async () => {
    const fake = client(undefined, {
      data: [{ status: "created", escalation_id: ID }],
      error: null,
    });
    await expect(createSupabaseEscalationRepository(fake.client).raise(input)).resolves.toEqual({
      status: "created",
      escalationId: ID,
    });
    expect(fake.rpcFn).toHaveBeenCalledWith("raise_escalation", {
      p_id: ID,
      p_planned_work_id: "pw",
      p_lines: [{ product_id: "collar", quantity_short: 10, reason: "shortage" }],
      p_note: "Need by Friday",
      p_shortage_cleared: false,
    });
  });

  it("maps a permission error to EscalationForbiddenError", async () => {
    const fake = client(undefined, { data: null, error: { code: "42501", message: "denied" } });
    await expect(createSupabaseEscalationRepository(fake.client).raise(input)).rejects.toThrowError(
      EscalationForbiddenError,
    );
  });

  it("rejects a malformed result", async () => {
    const fake = client(undefined, { data: [{ status: "weird", escalation_id: ID }], error: null });
    await expect(createSupabaseEscalationRepository(fake.client).raise(input)).rejects.toThrowError(
      DataAccessError,
    );
  });

  it("wraps other errors and empty results", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client(undefined, { data: null, error: { code: "500" } }).client,
      ).raise(input),
    ).rejects.toThrowError(DataAccessError);
    await expect(
      createSupabaseEscalationRepository(client(undefined, { data: [], error: null }).client).raise(
        input,
      ),
    ).rejects.toThrowError(DataAccessError);
  });
});

describe("listMine", () => {
  it("maps escalation summaries", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client({ data: [summaryRow], error: null }).client,
      ).listMine(),
    ).resolves.toEqual([summary]);
  });

  it("wraps errors", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client({ data: null, error: { message: "x" } }).client,
      ).listMine(),
    ).rejects.toThrowError("Could not load escalations");
  });
});

describe("get", () => {
  const recordRow = {
    ...summaryRow,
    resolution_comment: null,
    resolved_at: null,
    escalation_lines: [
      { quantity_short: "10.000", reason: "shortage", products: { name: "Collar", unit: "each" } },
      { quantity_short: null, reason: "no_nominated_solution", products: null },
    ],
    escalation_notes: [
      { id: "n2", body: "Chasing", created_at: "2026-11-03T12:00:00Z", profiles: null },
      {
        id: "n1",
        body: "Need by Friday",
        created_at: "2026-11-03T10:00:00Z",
        profiles: { display_name: "Sam" },
      },
    ],
  };

  it("maps lines and notes, oldest note first", async () => {
    const record = await createSupabaseEscalationRepository(
      client({ data: recordRow, error: null }).client,
    ).get(ID);
    expect(record).toEqual({
      ...summary,
      resolutionComment: null,
      resolvedAt: null,
      lines: [
        { productName: "Collar", unit: "each", quantityShort: 10, reason: "shortage" },
        { productName: null, unit: null, quantityShort: null, reason: "no_nominated_solution" },
      ],
      notes: [
        { id: "n1", body: "Need by Friday", createdAt: "2026-11-03T10:00:00Z", authorName: "Sam" },
        { id: "n2", body: "Chasing", createdAt: "2026-11-03T12:00:00Z", authorName: null },
      ],
    });
  });

  it("returns null when it is missing or hidden, and for non-UUIDs without querying", async () => {
    await expect(
      createSupabaseEscalationRepository(client({ data: null, error: null }).client).get(ID),
    ).resolves.toBeNull();
    const fake = client();
    await expect(createSupabaseEscalationRepository(fake.client).get("nope")).resolves.toBeNull();
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it("wraps errors", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client({ data: null, error: { message: "x" } }).client,
      ).get(ID),
    ).rejects.toThrowError("Could not load escalation");
  });
});

describe("addNote", () => {
  it("inserts the note", async () => {
    const fake = client({ data: null, error: null });
    await createSupabaseEscalationRepository(fake.client).addNote(ID, "Any update?");
    expect(fake.builder.insert).toHaveBeenCalledWith({ escalation_id: ID, body: "Any update?" });
  });

  it("maps permission errors and wraps others", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client({ data: null, error: { code: "42501" } }).client,
      ).addNote(ID, "x"),
    ).rejects.toThrowError(EscalationForbiddenError);
    await expect(
      createSupabaseEscalationRepository(
        client({ data: null, error: { code: "500" } }).client,
      ).addNote(ID, "x"),
    ).rejects.toThrowError(DataAccessError);
  });
});

describe("listForInbox", () => {
  it("returns escalations sorted for the inbox", async () => {
    const rows = [
      {
        ...summaryRow,
        id: "r-old",
        state: "resolved",
        raised_at: "2026-11-01T00:00:00Z",
        raised_by_profile: null,
      },
      { ...summaryRow, id: "o-new", raised_at: "2026-11-03T00:00:00Z" },
      { ...summaryRow, id: "o-old", raised_at: "2026-11-02T00:00:00Z" },
    ];
    const result = await createSupabaseEscalationRepository(
      client({ data: rows, error: null }).client,
    ).listForInbox();
    expect(result.map((escalation) => escalation.id)).toEqual(["o-old", "o-new", "r-old"]);
    expect(result[2]?.raisedByName).toBeNull();
  });

  it("wraps errors", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client({ data: null, error: { message: "x" } }).client,
      ).listForInbox(),
    ).rejects.toThrowError("Could not load escalations");
  });
});

describe("sortForInbox", () => {
  it("puts Open first, oldest first, then Resolved newest first", () => {
    const at = (id: string, state: "open" | "resolved", raisedAt: string) =>
      ({ ...summary, id, state, raisedAt }) as typeof summary & { state: "open" | "resolved" };
    expect(
      sortForInbox([
        at("r1", "resolved", "2026-11-01"),
        at("o2", "open", "2026-11-04"),
        at("r2", "resolved", "2026-11-05"),
        at("o1", "open", "2026-11-02"),
      ]).map((escalation) => escalation.id),
    ).toEqual(["o1", "o2", "r2", "r1"]);
  });
});

describe("resolve", () => {
  it("calls resolve_escalation and returns the status", async () => {
    const fake = client(undefined, { data: "resolved", error: null });
    await expect(
      createSupabaseEscalationRepository(fake.client).resolve(ID, "stock_arriving", null),
    ).resolves.toBe("resolved");
    expect(fake.rpcFn).toHaveBeenCalledWith("resolve_escalation", {
      p_id: ID,
      p_resolution: "stock_arriving",
      p_comment: null,
    });
  });

  it("maps permission errors, wraps others and rejects unknown statuses", async () => {
    await expect(
      createSupabaseEscalationRepository(
        client(undefined, { data: null, error: { code: "42501" } }).client,
      ).resolve(ID, "stock_arriving", null),
    ).rejects.toThrowError(EscalationForbiddenError);
    await expect(
      createSupabaseEscalationRepository(
        client(undefined, { data: null, error: { code: "500" } }).client,
      ).resolve(ID, "stock_arriving", null),
    ).rejects.toThrowError(DataAccessError);
    await expect(
      createSupabaseEscalationRepository(
        client(undefined, { data: "weird", error: null }).client,
      ).resolve(ID, "stock_arriving", null),
    ).rejects.toThrowError(DataAccessError);
  });
});
