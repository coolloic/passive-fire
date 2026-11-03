// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAnthropicApiKey = vi.fn();
const isAssistantEnabled = vi.fn();
const recordMessage = vi.fn();
const getPlannedWorkDetail = vi.fn();
const draftEscalationNote = vi.fn();
const loggerError = vi.fn();
const create = vi.fn(async () => "message");

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/env.server", () => ({ getAnthropicApiKey, isAssistantEnabled }));
vi.mock("@/lib/data/assistant-usage-repository", () => ({
  createSupabaseAssistantUsageRepository: () => ({ recordMessage }),
}));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: () => ({}) }));
vi.mock("@/lib/data/readiness-repository", () => ({
  createSupabaseReadinessDataSource: () => ({}),
}));
vi.mock("@/lib/services/planned-work-detail", () => ({ getPlannedWorkDetail }));
vi.mock("@/lib/logger", () => ({ logger: { error: loggerError } }));
vi.mock("./draft", () => ({ draftEscalationNote }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = { messages: { create } };
  },
}));

const { createDraftClient, handleDraftRequest } = await import("./draft-handler");

const PW = "a0000000-0000-4000-8005-000000000003";
const request = (body: unknown) =>
  new Request("http://localhost/api/assistant/draft", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const detail = {
  workDate: "2026-11-06",
  crewName: "Crew Alpha",
  siteName: "Harbour View",
  escalationLines: [{ description: "Short by 10 × Collar" }],
};

describe("handleDraftRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "u1", role: "team_leader" });
    getAnthropicApiKey.mockReturnValue("key");
    isAssistantEnabled.mockReturnValue(true);
    recordMessage.mockResolvedValue({ allowed: true, retryAt: null });
    getPlannedWorkDetail.mockResolvedValue(detail);
    draftEscalationNote.mockResolvedValue({ kind: "ok", draft: "Please send collars." });
  });

  it("drafts from server-computed facts", async () => {
    const response = await handleDraftRequest(
      request({ plannedWorkId: PW }),
      () => "client" as never,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ draft: "Please send collars." });
    expect(draftEscalationNote).toHaveBeenCalledWith("client", {
      date: "Fri 6 Nov",
      crew: "Crew Alpha",
      site: "Harbour View",
      lines: ["Short by 10 × Collar"],
    });
  });

  it.each([
    ["signed out", () => getCurrentUser.mockResolvedValue(null), 401],
    [
      "a project manager",
      () => getCurrentUser.mockResolvedValue({ id: "pm", role: "project_manager" }),
      403,
    ],
    ["switched off", () => isAssistantEnabled.mockReturnValue(false), 503],
    ["not configured", () => getAnthropicApiKey.mockReturnValue(null), 503],
  ])("refuses when %s", async (_label, arrange, status) => {
    arrange();
    expect((await handleDraftRequest(request({ plannedWorkId: PW }))).status).toBe(status);
    expect(draftEscalationNote).not.toHaveBeenCalled();
  });

  it.each([["{"], [{ plannedWorkId: "nope" }]])("rejects an invalid request (%j)", async (body) => {
    expect((await handleDraftRequest(request(body))).status).toBe(400);
  });

  it("is not found for planned work the user cannot see, without counting it", async () => {
    getPlannedWorkDetail.mockResolvedValue(null);
    expect((await handleDraftRequest(request({ plannedWorkId: PW }))).status).toBe(404);
    expect(recordMessage).not.toHaveBeenCalled();
  });

  it("applies the hourly limit", async () => {
    recordMessage.mockResolvedValue({ allowed: false, retryAt: "2026-11-03T15:00:00Z" });
    const response = await handleDraftRequest(request({ plannedWorkId: PW }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "rate_limited",
      retryAt: "2026-11-03T15:00:00Z",
    });
  });

  it("fails safely when the limit cannot be checked", async () => {
    recordMessage.mockRejectedValue(new Error("db"));
    expect((await handleDraftRequest(request({ plannedWorkId: PW }))).status).toBe(500);
    expect(draftEscalationNote).not.toHaveBeenCalled();
  });

  it.each(["refused", "empty"])("reports a %s draft", async (kind) => {
    draftEscalationNote.mockResolvedValue({ kind });
    const response = await handleDraftRequest(
      request({ plannedWorkId: PW }),
      () => "client" as never,
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: kind });
  });

  it("logs and reports unexpected errors", async () => {
    draftEscalationNote.mockRejectedValue(new Error("overloaded"));
    expect(
      (await handleDraftRequest(request({ plannedWorkId: PW }), () => "client" as never)).status,
    ).toBe(500);
    expect(loggerError).toHaveBeenCalled();
  });
});

describe("createDraftClient", () => {
  it("calls the beta messages API", async () => {
    await expect(
      createDraftClient("key")({ model: "m", max_tokens: 1, messages: [] }),
    ).resolves.toBe("message");
    expect(create).toHaveBeenCalledWith({ model: "m", max_tokens: 1, messages: [] });
  });
});
