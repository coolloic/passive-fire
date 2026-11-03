import { describe, expect, it, vi } from "vitest";
import { askAssistant } from "./client";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

const history = [{ role: "user" as const, content: "What is short?" }];
const fetcherFor = (response: Response | Error) =>
  vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });

describe("askAssistant", () => {
  it("posts the conversation and streams text, even when lines split across chunks", async () => {
    const onText = vi.fn();
    const fetcher = fetcherFor(
      new Response(
        streamOf([
          '{"type":"text","text":"Crew "}\n{"type":"te',
          'xt","text":"Alpha"}\n',
          '{"type":"done","status":"ok"}',
        ]),
      ),
    );
    await expect(askAssistant(history, onText, fetcher)).resolves.toEqual({
      kind: "done",
      status: "ok",
    });
    expect(onText.mock.calls.map(([delta]) => delta)).toEqual(["Crew ", "Alpha"]);
    expect(fetcher).toHaveBeenCalledWith("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
  });

  it("passes through refused and truncated statuses, ignoring unknown events and blank lines", async () => {
    const fetcher = fetcherFor(
      new Response(streamOf(['{"type":"mystery"}\n\n{"type":"done","status":"refused"}\n'])),
    );
    await expect(askAssistant(history, vi.fn(), fetcher)).resolves.toEqual({
      kind: "done",
      status: "refused",
    });
  });

  it("reports an error event", async () => {
    const fetcher = fetcherFor(new Response(streamOf(['{"type":"error"}\n'])));
    await expect(askAssistant(history, vi.fn(), fetcher)).resolves.toEqual({ kind: "error" });
  });

  it("reports an error when the stream ends without a result", async () => {
    await expect(
      askAssistant(history, vi.fn(), fetcherFor(new Response(streamOf([])))),
    ).resolves.toEqual({ kind: "error" });
  });

  it("reports an error when the stream is malformed", async () => {
    await expect(
      askAssistant(history, vi.fn(), fetcherFor(new Response(streamOf(["not json\n"])))),
    ).resolves.toEqual({ kind: "error" });
  });

  it.each([
    [503, { kind: "not_configured" }],
    [401, { kind: "unavailable" }],
    [403, { kind: "unavailable" }],
    [500, { kind: "error" }],
  ])("maps HTTP %d", async (status, expected) => {
    await expect(
      askAssistant(history, vi.fn(), fetcherFor(new Response("{}", { status }))),
    ).resolves.toEqual(expected);
  });

  it.each([
    [{ error: "disabled" }, { kind: "disabled" }],
    [{ error: "not_configured" }, { kind: "not_configured" }],
    ["not json", { kind: "not_configured" }],
    [null, { kind: "not_configured" }],
  ])("tells a switched-off assistant from an unconfigured one (%j)", async (body, expected) => {
    const response = new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: 503,
    });
    await expect(askAssistant(history, vi.fn(), fetcherFor(response))).resolves.toEqual(expected);
  });

  it.each([
    [{ error: "rate_limited", retryAt: "2026-11-03T15:00:00Z" }, "2026-11-03T15:00:00Z"],
    [{ error: "rate_limited" }, null],
  ])("reports the rate limit with the retry time (%j)", async (body, retryAt) => {
    const response = new Response(JSON.stringify(body), { status: 429 });
    await expect(askAssistant(history, vi.fn(), fetcherFor(response))).resolves.toEqual({
      kind: "rate_limited",
      retryAt,
    });
  });

  it("reports an error when the request fails or has no body", async () => {
    await expect(
      askAssistant(history, vi.fn(), fetcherFor(new TypeError("Failed to fetch"))),
    ).resolves.toEqual({ kind: "error" });
    await expect(
      askAssistant(history, vi.fn(), fetcherFor(new Response(null, { status: 200 }))),
    ).resolves.toEqual({ kind: "error" });
  });

  it("uses the browser's fetch by default", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(askAssistant(history, vi.fn())).resolves.toEqual({ kind: "not_configured" });
    spy.mockRestore();
  });
});
