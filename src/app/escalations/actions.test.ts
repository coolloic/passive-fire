import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const raiseEscalation = vi.fn();
const addEscalationNote = vi.fn();
const resolveEscalation = vi.fn();
const revalidatePath = vi.fn();
const loggerError = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/services/escalations", () => ({
  raiseEscalation,
  addEscalationNote,
  resolveEscalation,
}));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: () => ({}) }));
vi.mock("@/lib/data/readiness-repository", () => ({
  createSupabaseReadinessDataSource: () => "readiness",
}));
vi.mock("@/lib/data/escalation-repository", () => ({
  createSupabaseEscalationRepository: () => "escalations",
}));
vi.mock("@/lib/logger", () => ({ logger: { error: loggerError } }));

const { addNoteAction, raiseEscalationAction, resolveEscalationAction } = await import("./actions");
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

describe("resolveEscalationAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves for a project manager and refreshes both sides", async () => {
    getCurrentUser.mockResolvedValue({ role: "project_manager" });
    resolveEscalation.mockResolvedValue({ kind: "resolved" });
    await expect(
      resolveEscalationAction({ escalationId: "e1", resolution: "stock_arriving", comment: "" }),
    ).resolves.toEqual({
      kind: "resolved",
    });
    expect(resolveEscalation).toHaveBeenCalledWith("escalations", {
      escalationId: "e1",
      resolution: "stock_arriving",
      comment: "",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/inbox", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/escalations", "layout");
  });

  it("passes a missing resolution through as undefined so validation names it", async () => {
    getCurrentUser.mockResolvedValue({ role: "project_manager" });
    resolveEscalation.mockResolvedValue({
      kind: "invalid",
      message: "Choose how the shortage was resolved.",
    });
    await resolveEscalationAction({ escalationId: "e1", resolution: "", comment: "" });
    expect(resolveEscalation).toHaveBeenCalledWith("escalations", {
      escalationId: "e1",
      resolution: undefined,
      comment: "",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([null, { role: "team_leader" }])(
    "refuses anyone but a project manager (%j)",
    async (user) => {
      getCurrentUser.mockResolvedValue(user);
      await expect(
        resolveEscalationAction({ escalationId: "e1", resolution: "stock_arriving", comment: "" }),
      ).resolves.toEqual({
        kind: "not_found",
      });
      expect(resolveEscalation).not.toHaveBeenCalled();
    },
  );

  it("logs and reports unexpected errors", async () => {
    getCurrentUser.mockResolvedValue({ role: "project_manager" });
    resolveEscalation.mockRejectedValue(new Error("db"));
    await expect(
      resolveEscalationAction({ escalationId: "e1", resolution: "stock_arriving", comment: "" }),
    ).resolves.toEqual({
      kind: "error",
    });
    expect(loggerError).toHaveBeenCalled();
  });
});
