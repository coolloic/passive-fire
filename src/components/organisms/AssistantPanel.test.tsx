import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskResult } from "@/lib/assistant/client";
import { AssistantPanel } from "./AssistantPanel";

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

async function openAndAsk(
  ask: Parameters<typeof AssistantPanel>[0]["ask"],
  question = "What is short on Thursday?",
) {
  render(<AssistantPanel ask={ask} />);
  await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
  await userEvent.type(screen.getByLabelText("Your question"), question);
  await userEvent.click(screen.getByRole("button", { name: "Ask" }));
}

describe("AssistantPanel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens, streams an answer and keeps the conversation", async () => {
    setOnline(true);
    const ask = vi.fn(async (_history, onText: (delta: string) => void): Promise<AskResult> => {
      onText("Crew Alpha ");
      onText("is short of collars.");
      return { kind: "done", status: "ok" };
    });
    await openAndAsk(ask);
    expect(await screen.findByText("Crew Alpha is short of collars.")).toBeInTheDocument();
    expect(screen.getByText("What is short on Thursday?")).toBeInTheDocument();
    expect(ask.mock.calls[0]?.[0]).toEqual([
      { role: "user", content: "What is short on Thursday?" },
    ]);
    expect(screen.getByLabelText("Your question")).toHaveValue("");

    await userEvent.type(screen.getByLabelText("Your question"), "And Friday?");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => expect(ask).toHaveBeenCalledTimes(2));
    expect(ask.mock.calls[1]?.[0]).toHaveLength(3);
  });

  it.each<[AskResult, string]>([
    [{ kind: "done", status: "refused" }, "The assistant can't help with that question."],
    [{ kind: "done", status: "truncated" }, "The answer was cut short. Ask a narrower question."],
  ])("explains a %o answer", async (result, message) => {
    setOnline(true);
    await openAndAsk(vi.fn(async () => result));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByText("(no answer)")).toBeInTheDocument();
  });

  it.each<[AskResult, string]>([
    [{ kind: "not_configured" }, "The assistant isn't set up on this server."],
    [{ kind: "unavailable" }, "The assistant isn't available for your account."],
    [{ kind: "disabled" }, "The assistant is switched off on this server."],
    [
      { kind: "rate_limited", retryAt: "2026-11-03T15:00:00Z" },
      "You've reached the limit of 20 questions an hour. Try again after 3 Nov, 15:00.",
    ],
    [
      { kind: "rate_limited", retryAt: null },
      "You've reached the limit of 20 questions an hour. Try again later.",
    ],
    [{ kind: "error" }, "Something went wrong. Try again."],
  ])("shows %o and keeps the question to retry", async (result, message) => {
    setOnline(true);
    await openAndAsk(vi.fn(async () => result));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Your question")).toHaveValue("What is short on Thursday?");
    expect(
      screen.queryByText("What is short on Thursday?", { selector: "li" }),
    ).not.toBeInTheDocument();
  });

  it("shows Thinking while waiting and blocks a second question", async () => {
    setOnline(true);
    let finish: (result: AskResult) => void = () => {};
    const ask = vi.fn(() => new Promise<AskResult>((resolve) => (finish = resolve)));
    await openAndAsk(ask);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answering…" })).toBeDisabled();
    finish({ kind: "done", status: "ok" });
    expect(await screen.findByText("(no answer)")).toBeInTheDocument();
  });

  it("ignores an empty question", async () => {
    setOnline(true);
    const ask = vi.fn();
    render(<AssistantPanel ask={ask} />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your question"), "   ");
    fireEvent.submit(screen.getByRole("button", { name: "Ask" }).closest("form")!);
    expect(ask).not.toHaveBeenCalled();
  });

  it("explains it needs a connection while offline", async () => {
    setOnline(false);
    render(<AssistantPanel ask={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByRole("status")).toHaveTextContent("The assistant needs a connection.");
    expect(screen.getByLabelText("Your question")).toBeDisabled();
  });

  it("closes again", async () => {
    setOnline(true);
    render(<AssistantPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Ask the assistant" })).toBeInTheDocument();
  });
});
