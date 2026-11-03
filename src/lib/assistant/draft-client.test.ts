import { describe, expect, it, vi } from "vitest";
import { requestDraft } from "./draft-client";

const respond = (status: number, body: unknown) =>
  vi.fn(
    async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );

describe("requestDraft", () => {
  it("posts the planned work and returns the draft", async () => {
    const fetcher = respond(200, { draft: "Please send collars." });
    await expect(requestDraft("pw", fetcher)).resolves.toEqual({
      kind: "ok",
      draft: "Please send collars.",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/assistant/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plannedWorkId: "pw" }),
    });
  });

  it.each([
    [503, { error: "disabled" }, { kind: "disabled" }],
    [503, { error: "not_configured" }, { kind: "not_configured" }],
    [
      429,
      { error: "rate_limited", retryAt: "2026-11-03T15:00:00Z" },
      { kind: "rate_limited", retryAt: "2026-11-03T15:00:00Z" },
    ],
    [429, { error: "rate_limited" }, { kind: "rate_limited", retryAt: null }],
    [422, { error: "refused" }, { kind: "no_draft" }],
    [500, { error: "unavailable" }, { kind: "error" }],
    [200, { nothing: true }, { kind: "error" }],
    [200, null, { kind: "error" }],
  ])("maps HTTP %d %j", async (status, body, expected) => {
    await expect(requestDraft("pw", respond(status, body))).resolves.toEqual(expected);
  });

  it("reports an error when the request fails or the reply is not JSON", async () => {
    await expect(
      requestDraft(
        "pw",
        vi.fn(async () => Promise.reject(new TypeError("offline"))),
      ),
    ).resolves.toEqual({ kind: "error" });
    await expect(requestDraft("pw", respond(200, "not json"))).resolves.toEqual({ kind: "error" });
  });

  it("uses the browser's fetch by default", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ draft: "x" })));
    await expect(requestDraft("pw")).resolves.toEqual({ kind: "ok", draft: "x" });
    spy.mockRestore();
  });
});
