import { describe, expect, it, vi } from "vitest";
import {
  EscalationForbiddenError,
  type EscalationRepository,
} from "@/lib/data/escalation-repository";
import type { PlannedWorkDetailSource, PlannedWorkRecord } from "@/lib/data/readiness-repository";
import { addEscalationNote, raiseEscalation, resolveEscalation } from "./escalations";

const TODAY = "2026-11-10";
const ID = "a0000000-0000-4000-8007-000000000001";
const PW = "a0000000-0000-4000-8005-000000000003";

const record = (): PlannedWorkRecord => ({
  plannedWorkId: PW,
  workDate: "2026-11-12",
  createdAt: "2026-10-01T00:00:00Z",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  scenarios: [
    {
      scenarioId: "s1",
      label: "Risers",
      penetrationCount: 5,
      nominatedSolutionId: "sol",
      solutionCode: "0798",
      requirements: [{ productId: "collar", quantityPerPenetration: 2 }],
    },
  ],
});

function readiness(
  collarStock = 4,
  plannedWork: PlannedWorkRecord | null = record(),
): PlannedWorkDetailSource {
  return {
    listOwnPlannedWork: vi.fn(async () => []),
    getPlannedWork: vi.fn(async () => plannedWork),
    getAllocationDemand: vi.fn(async () => []),
    getSupply: vi.fn(async () => ({ stock: new Map([["collar", collarStock]]), deliveries: [] })),
    getProducts: vi.fn(async () => [{ id: "collar", name: "Collar", unit: "each" as const }]),
    getOpenEscalationId: vi.fn(async () => null),
  };
}

function escalations(overrides: Partial<EscalationRepository> = {}): EscalationRepository {
  return {
    raise: vi.fn(async () => ({ status: "created" as const, escalationId: ID })),
    listMine: vi.fn(async () => []),
    listForInbox: vi.fn(async () => []),
    resolve: vi.fn(async () => "resolved" as const),
    get: vi.fn(async () => null),
    addNote: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("raiseEscalation", () => {
  it("raises with lines recomputed on the server and a trimmed note", async () => {
    const repo = escalations();
    const result = await raiseEscalation(
      { readiness: readiness(), escalations: repo },
      { id: ID, plannedWorkId: PW, note: "  Need by Friday  ", lines: [{ fake: true }] },
      TODAY,
    );
    expect(result).toEqual({ kind: "created", escalationId: ID });
    expect(repo.raise).toHaveBeenCalledWith({
      id: ID,
      plannedWorkId: PW,
      lines: [{ productId: "collar", quantityShort: 6, reason: "shortage" }],
      note: "Need by Friday",
      shortageCleared: false,
    });
  });

  it("sends no note when it is blank, and flags work that is now Ready", async () => {
    const repo = escalations();
    await raiseEscalation(
      { readiness: readiness(20), escalations: repo },
      { id: ID, plannedWorkId: PW, note: "   " },
      TODAY,
    );
    expect(repo.raise).toHaveBeenCalledWith(
      expect.objectContaining({ note: null, shortageCleared: true, lines: [] }),
    );
  });

  it.each(["duplicate", "already_open"] as const)(
    "passes through the %s status",
    async (status) => {
      const repo = escalations({ raise: vi.fn(async () => ({ status, escalationId: "other" })) });
      await expect(
        raiseEscalation(
          { readiness: readiness(), escalations: repo },
          { id: ID, plannedWorkId: PW },
          TODAY,
        ),
      ).resolves.toEqual({
        kind: status,
        escalationId: "other",
      });
    },
  );

  it.each([
    [{ id: "nope", plannedWorkId: PW }, /Invalid UUID/i],
    [{ id: ID, plannedWorkId: PW, note: "x".repeat(1001) }, /1000 characters/],
    [null, /expected object/i],
  ])("rejects invalid input %#", async (input, message) => {
    const result = await raiseEscalation(
      { readiness: readiness(), escalations: escalations() },
      input,
      TODAY,
    );
    expect(result.kind).toBe("invalid");
    expect(result.kind === "invalid" && result.message).toMatch(message);
  });

  it("accepts a note of exactly 1000 characters", async () => {
    const result = await raiseEscalation(
      { readiness: readiness(), escalations: escalations() },
      { id: ID, plannedWorkId: PW, note: "x".repeat(1000) },
      TODAY,
    );
    expect(result.kind).toBe("created");
  });

  it("is not found when the planned work is missing or hidden", async () => {
    await expect(
      raiseEscalation(
        { readiness: readiness(4, null), escalations: escalations() },
        { id: ID, plannedWorkId: PW },
        TODAY,
      ),
    ).resolves.toEqual({ kind: "not_found" });
  });

  it("is not found when the database refuses the insert", async () => {
    const repo = escalations({
      raise: vi.fn(async () => Promise.reject(new EscalationForbiddenError())),
    });
    await expect(
      raiseEscalation(
        { readiness: readiness(), escalations: repo },
        { id: ID, plannedWorkId: PW },
        TODAY,
      ),
    ).resolves.toEqual({
      kind: "not_found",
    });
  });

  it("rethrows unexpected errors", async () => {
    const repo = escalations({ raise: vi.fn(async () => Promise.reject(new Error("db down"))) });
    await expect(
      raiseEscalation(
        { readiness: readiness(), escalations: repo },
        { id: ID, plannedWorkId: PW },
        TODAY,
      ),
    ).rejects.toThrow("db down");
  });
});

describe("addEscalationNote", () => {
  it("adds a trimmed note", async () => {
    const repo = escalations();
    await expect(
      addEscalationNote(repo, { escalationId: ID, body: " Any update? " }),
    ).resolves.toEqual({ kind: "added" });
    expect(repo.addNote).toHaveBeenCalledWith(ID, "Any update?");
  });

  it.each([
    [{ escalationId: ID, body: "   " }, "Write a note before adding it."],
    [{ escalationId: ID, body: "x".repeat(1001) }, "Keep the note to 1000 characters or fewer."],
  ])("rejects %#", async (input, message) => {
    await expect(addEscalationNote(escalations(), input)).resolves.toEqual({
      kind: "invalid",
      message,
    });
  });

  it("is not found when the database refuses it, and rethrows other errors", async () => {
    await expect(
      addEscalationNote(
        escalations({ addNote: vi.fn(async () => Promise.reject(new EscalationForbiddenError())) }),
        { escalationId: ID, body: "Hi" },
      ),
    ).resolves.toEqual({ kind: "not_found" });
    await expect(
      addEscalationNote(
        escalations({ addNote: vi.fn(async () => Promise.reject(new Error("db"))) }),
        { escalationId: ID, body: "Hi" },
      ),
    ).rejects.toThrow("db");
  });

  it("uses a generic message when validation gives none", async () => {
    await expect(addEscalationNote(escalations(), undefined)).resolves.toMatchObject({
      kind: "invalid",
    });
  });
});

describe("resolveEscalation", () => {
  it("resolves with the reason and a trimmed comment", async () => {
    const repo = escalations();
    await expect(
      resolveEscalation(repo, {
        escalationId: ID,
        resolution: "stock_arriving",
        comment: " Due Tuesday ",
      }),
    ).resolves.toEqual({
      kind: "resolved",
    });
    expect(repo.resolve).toHaveBeenCalledWith(ID, "stock_arriving", "Due Tuesday");
  });

  it("sends no comment when it is blank", async () => {
    const repo = escalations();
    await resolveEscalation(repo, {
      escalationId: ID,
      resolution: "planned_work_rescheduled",
      comment: "  ",
    });
    expect(repo.resolve).toHaveBeenCalledWith(ID, "planned_work_rescheduled", null);
  });

  it.each(["not_open", "not_found"] as const)("passes through %s", async (status) => {
    const repo = escalations({ resolve: vi.fn(async () => status) });
    await expect(
      resolveEscalation(repo, { escalationId: ID, resolution: "stock_arriving" }),
    ).resolves.toEqual({ kind: status });
  });

  it("requires a resolution", async () => {
    await expect(resolveEscalation(escalations(), { escalationId: ID })).resolves.toEqual({
      kind: "invalid",
      message: "Choose how the shortage was resolved.",
    });
  });

  it("rejects an unknown resolution and a long comment", async () => {
    await expect(
      resolveEscalation(escalations(), { escalationId: ID, resolution: "ignored" }),
    ).resolves.toMatchObject({ kind: "invalid" });
    await expect(
      resolveEscalation(escalations(), {
        escalationId: ID,
        resolution: "stock_arriving",
        comment: "x".repeat(1001),
      }),
    ).resolves.toEqual({ kind: "invalid", message: "Keep the note to 1000 characters or fewer." });
  });

  it("is not found when the database refuses, and rethrows other errors", async () => {
    await expect(
      resolveEscalation(
        escalations({ resolve: vi.fn(async () => Promise.reject(new EscalationForbiddenError())) }),
        {
          escalationId: ID,
          resolution: "stock_arriving",
        },
      ),
    ).resolves.toEqual({ kind: "not_found" });
    await expect(
      resolveEscalation(
        escalations({ resolve: vi.fn(async () => Promise.reject(new Error("db"))) }),
        {
          escalationId: ID,
          resolution: "stock_arriving",
        },
      ),
    ).rejects.toThrow("db");
  });
});
