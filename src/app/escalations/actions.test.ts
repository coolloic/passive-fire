import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const raiseEscalation = vi.fn();
const addEscalationNote = vi.fn();
const revalidatePath = vi.fn();
const loggerError = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/services/escalations", () => ({ raiseEscalation, addEscalationNote }));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: () => ({}) }));
vi.mock("@/lib/data/readiness-repository", () => ({
  createSupabaseReadinessDataSource: () => "readiness",
}));
vi.mock("@/lib/data/escalation-repository", () => ({
  createSupabaseEscalationRepository: () => "escalations",
}));
vi.mock("@/lib/logger", () => ({ logger: { error: loggerError } }));

const { addNoteAction, raiseEscalationAction } = await import("./actions");
const request = { id: "e1", plannedWorkId: "pw", note: "" };

describe("raiseEscalationAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("raises for a team leader and refreshes the affected pages", async () => {
    getCurrentUser.mockResolvedValue({ role: "team_leader" });
    raiseEscalation.mockResolvedValue({ kind: "created", escalationId: "e1" });
    await expect(raiseEscalationAction(request)).resolves.toEqual({
      kind: "created",
      escalationId: "e1",
    });
    expect(raiseEscalation).toHaveBeenCalledWith(
      { readiness: "readiness", escalations: "escalations" },
      request,
      expect.any(String),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/escalations");
  });

  it("does not refresh pages when nothing was created", async () => {
    getCurrentUser.mockResolvedValue({ role: "team_leader" });
    raiseEscalation.mockResolvedValue({ kind: "already_open", escalationId: "e0" });
    await raiseEscalationAction(request);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([null, { role: "project_manager" }])(
    "refuses anyone but a team leader (%j)",
    async (user) => {
      getCurrentUser.mockResolvedValue(user);
      await expect(raiseEscalationAction(request)).resolves.toEqual({ kind: "not_found" });
      expect(raiseEscalation).not.toHaveBeenCalled();
    },
  );

  it("logs and reports unexpected errors", async () => {
    getCurrentUser.mockResolvedValue({ role: "team_leader" });
    raiseEscalation.mockRejectedValue(new Error("db"));
    await expect(raiseEscalationAction(request)).resolves.toEqual({ kind: "error" });
    expect(loggerError).toHaveBeenCalled();
  });
});

describe("addNoteAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds the note for a signed-in user and refreshes the escalation", async () => {
    getCurrentUser.mockResolvedValue({ role: "project_manager" });
    addEscalationNote.mockResolvedValue({ kind: "added" });
    await expect(addNoteAction({ escalationId: "e1", body: "Hi" })).resolves.toEqual({
      kind: "added",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/escalations/e1");
  });

  it("does not refresh when the note was rejected", async () => {
    getCurrentUser.mockResolvedValue({ role: "team_leader" });
    addEscalationNote.mockResolvedValue({ kind: "invalid", message: "x" });
    await addNoteAction({ escalationId: "e1", body: "" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses signed-out users", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(addNoteAction({ escalationId: "e1", body: "Hi" })).resolves.toEqual({
      kind: "not_found",
    });
  });

  it("logs and reports unexpected errors", async () => {
    getCurrentUser.mockRejectedValue(new Error("auth down"));
    await expect(addNoteAction({ escalationId: "e1", body: "Hi" })).resolves.toEqual({
      kind: "error",
    });
    expect(loggerError).toHaveBeenCalled();
  });
});
