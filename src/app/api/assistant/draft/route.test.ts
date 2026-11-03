// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const handleDraftRequest = vi.fn(async () => new Response("ok"));
vi.mock("@/lib/assistant/draft-handler", () => ({ handleDraftRequest }));

const { POST, dynamic } = await import("./route");

describe("POST /api/assistant/draft", () => {
  it("delegates to the draft handler and is never cached", async () => {
    const request = new Request("http://localhost/api/assistant/draft", { method: "POST" });
    await expect((await POST(request)).text()).resolves.toBe("ok");
    expect(handleDraftRequest).toHaveBeenCalledWith(request);
    expect(dynamic).toBe("force-dynamic");
  });
});
