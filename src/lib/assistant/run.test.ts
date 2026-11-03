import { describe, expect, it, vi } from "vitest";
import {
  ASSISTANT_MODEL,
  MAX_ANSWER_TOKENS,
  runAssistant,
  trimHistory,
  type ChatTurn,
  type TurnStream,
} from "./run";

function fakeTurn(texts: string[], stopReason: string | null): TurnStream {
  return {
    on: (_event, listener) => texts.forEach(listener),
    finalMessage: async () => ({ stop_reason: stopReason }),
  };
}

function fakeRunner(turns: TurnStream[]) {
  const createRunner = vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      yield* turns;
    },
  }));
  return createRunner;
}

const history: ChatTurn[] = [{ role: "user", content: "What is short on Thursday?" }];

describe("runAssistant", () => {
  it("streams text from every turn and reports ok", async () => {
    const onText = vi.fn();
    const createRunner = fakeRunner([
      fakeTurn([], "tool_use"),
      fakeTurn(["Crew Alpha ", "is short."], "end_turn"),
    ]);
    const status = await runAssistant({
      createRunner,
      tools: [],
      history,
      today: "2026-11-10",
      asOf: "08:00",
      onText,
    });
    expect(status).toBe("ok");
    expect(onText.mock.calls.map(([delta]) => delta)).toEqual(["Crew Alpha ", "is short."]);
  });

  it("sends the model, caps, effort, fallbacks and grounded system prompt", async () => {
    const createRunner = fakeRunner([fakeTurn(["ok"], "end_turn")]);
    await runAssistant({
      createRunner,
      tools: [],
      history,
      today: "2026-11-10",
      asOf: "10 Nov, 08:00",
      onText: vi.fn(),
    });
    const params = (createRunner.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(params).toMatchObject({
      model: ASSISTANT_MODEL,
      max_tokens: MAX_ANSWER_TOKENS,
      stream: true,
      output_config: { effort: "low" },
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      messages: [{ role: "user", content: "What is short on Thursday?" }],
    });
    const system = params.system as { text: string }[];
    expect(system[0]?.text).toContain(
      "Never say that a solution other than the nominated solution is compliant",
    );
    expect(system[1]?.text).toBe("Today is 2026-11-10. Data as of 10 Nov, 08:00.");
  });

  it.each([
    ["refusal", "refused"],
    ["max_tokens", "truncated"],
  ])("reports a final %s as %s", async (stopReason, expected) => {
    const status = await runAssistant({
      createRunner: fakeRunner([fakeTurn([], stopReason)]),
      tools: [],
      history,
      today: "2026-11-10",
      asOf: "08:00",
      onText: vi.fn(),
    });
    expect(status).toBe(expected);
  });

  it("reports ok when the runner yields nothing", async () => {
    await expect(
      runAssistant({
        createRunner: fakeRunner([]),
        tools: [],
        history,
        today: "x",
        asOf: "y",
        onText: vi.fn(),
      }),
    ).resolves.toBe("ok");
  });
});

describe("trimHistory", () => {
  const turn = (role: ChatTurn["role"], n: number): ChatTurn => ({ role, content: `${role} ${n}` });

  it("keeps the last 10 messages, starting with a user turn", () => {
    const long = Array.from({ length: 13 }, (_, n) => turn(n % 2 === 0 ? "user" : "assistant", n));
    const trimmed = trimHistory(long);
    expect(trimmed.length).toBeLessThanOrEqual(10);
    expect(trimmed[0]?.role).toBe("user");
    expect(trimmed.at(-1)).toEqual(long.at(-1));
  });

  it("returns nothing when there is no user turn", () => {
    expect(trimHistory([turn("assistant", 1)])).toEqual([]);
  });
});
