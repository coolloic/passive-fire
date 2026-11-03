import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AskResult } from "@/lib/assistant/client";
import { resetAssistant, useAssistantStore, type Ask } from "./assistant-store";

const state = () => useAssistantStore.getState();
const askWith = (question: string, ask: Ask) => {
  state().setQuestion(question);
  return state().send(ask);
};

describe("assistant store", () => {
  beforeEach(() => resetAssistant());

  it("starts closed and empty", () => {
    expect(state()).toMatchObject({
      open: false,
      history: [],
      question: "",
      pending: false,
      notice: null,
    });
  });

  it("opens and closes", () => {
    state().setOpen(true);
    expect(state().open).toBe(true);
    state().setOpen(false);
    expect(state().open).toBe(false);
  });

  it("streams an answer into the conversation and sends the history", async () => {
    let seenWhileStreaming: unknown;
    const ask = vi.fn<Ask>(async (_history, onText) => {
      onText("Crew Alpha ");
      seenWhileStreaming = state().history.at(-1);
      onText("is short.");
      return { kind: "done", status: "ok" };
    });
    await askWith("  What is short?  ", ask);
    expect(ask.mock.calls[0][0]).toEqual([{ role: "user", content: "What is short?" }]);
    expect(seenWhileStreaming).toEqual({ role: "assistant", content: "Crew Alpha " });
    expect(state()).toMatchObject({
      history: [
        { role: "user", content: "What is short?" },
        { role: "assistant", content: "Crew Alpha is short." },
      ],
      question: "",
      pending: false,
      notice: null,
    });

    await askWith("And Friday?", ask);
    expect(ask.mock.calls[1][0]).toHaveLength(3);
  });

  it("is pending while answering and ignores another question meanwhile", async () => {
    let finish: (result: AskResult) => void = () => {};
    const ask = vi.fn<Ask>(() => new Promise((resolve) => (finish = resolve)));
    const first = askWith("One", ask);
    expect(state().pending).toBe(true);
    await askWith("Two", ask);
    expect(ask).toHaveBeenCalledOnce();
    finish({ kind: "done", status: "ok" });
    await first;
    expect(state().history.at(-1)).toEqual({ role: "assistant", content: "(no answer)" });
  });

  it("ignores an empty or blank question", async () => {
    const ask = vi.fn<Ask>();
    await askWith("", ask);
    await askWith("   ", ask);
    expect(ask).not.toHaveBeenCalled();
  });

  it.each(["refused", "truncated"] as const)("keeps a %s answer with a notice", async (status) => {
    await askWith("Q", async (_history, onText) => {
      onText("Partial");
      return { kind: "done", status };
    });
    expect(state().history.at(-1)).toEqual({ role: "assistant", content: "Partial" });
    expect(state().notice).toEqual({ kind: status });
  });

  it("restores the question and conversation when asking fails", async () => {
    await askWith("First", async () => ({ kind: "done", status: "ok" }));
    const before = state().history;
    await askWith("Second", async () => ({ kind: "rate_limited", retryAt: null }));
    expect(state()).toMatchObject({
      history: before,
      question: "Second",
      pending: false,
      notice: { kind: "rate_limited", retryAt: null },
    });
  });

  it("drops an answer that arrives after a reset (sign-out)", async () => {
    let stream: (delta: string) => void = () => {};
    let finish: (result: AskResult) => void = () => {};
    const pendingAnswer = askWith("Private question", (_history, onText) => {
      stream = onText;
      return new Promise((resolve) => (finish = resolve));
    });
    resetAssistant();
    stream("Private answer");
    finish({ kind: "done", status: "ok" });
    await pendingAnswer;
    expect(state()).toMatchObject({ history: [], pending: false, question: "" });
  });
});
