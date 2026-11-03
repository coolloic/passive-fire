// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const handleAssistantRequest = vi.fn(async () => new Response("ok"));
vi.mock("@/lib/assistant/handler", () => ({ handleAssistantRequest }));

const { POST, dynamic } = await import("./route");

describe("POST /api/assistant", () => {
  it("delegates to the assistant handler and is never cached", async () => {
    const request = new Request("http://localhost/api/assistant", { method: "POST" });
    await expect((await POST(request)).text()).resolves.toBe("ok");
    expect(handleAssistantRequest).toHaveBeenCalledWith(request);
    expect(dynamic).toBe("force-dynamic");
  });
});
