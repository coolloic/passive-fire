// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAnthropicApiKey = vi.fn();
const runAssistant = vi.fn();
const loggerError = vi.fn();
const toolRunner = vi.fn(() => "runner");

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/env.server", () => ({ getAnthropicApiKey }));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: () => ({}) }));
vi.mock("@/lib/data/readiness-repository", () => ({
  createSupabaseReadinessDataSource: () => ({}),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: loggerError } }));
vi.mock("./tools", () => ({ createAssistantTools: () => ["tool"] }));
vi.mock("./run", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./run")>()),
  runAssistant,
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = { messages: { toolRunner } };
    constructor(public options: unknown) {}
  },
}));

const { createRunnerFactory, handleAssistantRequest } = await import("./handler");

const request = (body: unknown) =>
  new Request("http://localhost/api/assistant", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const question = { messages: [{ role: "user", content: "What is short?" }] };

async function readEvents(response: Response) {
  return (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

describe("handleAssistantRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "u1", role: "team_leader" });
    getAnthropicApiKey.mockReturnValue("key");
  });

  it("refuses signed-out users and project managers", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    expect((await handleAssistantRequest(request(question))).status).toBe(401);
    getCurrentUser.mockResolvedValueOnce({ id: "pm", role: "project_manager" });
    expect((await handleAssistantRequest(request(question))).status).toBe(403);
    expect(runAssistant).not.toHaveBeenCalled();
  });

  it("reports when the assistant is not configured", async () => {
    getAnthropicApiKey.mockReturnValue(null);
    const response = await handleAssistantRequest(request(question));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it.each([
    ["malformed JSON", "{"],
    ["no messages", { messages: [] }],
    ["a last message from the assistant", { messages: [{ role: "assistant", content: "hi" }] }],
    ["an empty question", { messages: [{ role: "user", content: "  " }] }],
    ["a question that is too long", { messages: [{ role: "user", content: "x".repeat(2001) }] }],
  ])("rejects %s", async (_label, body) => {
    expect((await handleAssistantRequest(request(body))).status).toBe(400);
  });

  it("streams text events then the final status", async () => {
    runAssistant.mockImplementation(async ({ onText }: { onText: (text: string) => void }) => {
      onText("Crew Alpha ");
      onText("is short.");
      return "ok";
    });
    const runnerFactory = vi.fn(() => "factory");
    const response = await handleAssistantRequest(request(question), runnerFactory as never);
    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(await readEvents(response)).toEqual([
      { type: "text", text: "Crew Alpha " },
      { type: "text", text: "is short." },
      { type: "done", status: "ok" },
    ]);
    expect(runnerFactory).toHaveBeenCalledWith("key");
    expect(runAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        createRunner: "factory",
        tools: ["tool"],
        history: question.messages,
      }),
    );
  });

  it("sends an error event and logs when the assistant fails", async () => {
    runAssistant.mockRejectedValue(new Error("overloaded"));
    const response = await handleAssistantRequest(request(question), (() => "factory") as never);
    expect(await readEvents(response)).toEqual([{ type: "error" }]);
    expect(loggerError).toHaveBeenCalled();
  });
});

describe("createRunnerFactory", () => {
  it("builds a streaming tool runner with the API key", () => {
    const factory = createRunnerFactory("key");
    expect(factory({ model: "m", max_tokens: 1, messages: [], tools: [] })).toBe("runner");
    expect(toolRunner).toHaveBeenCalledWith(expect.objectContaining({ model: "m", stream: true }));
  });
});
