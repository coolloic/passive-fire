import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskResult } from "@/lib/assistant/client";
import { resetAssistant, useAssistantStore } from "@/stores/assistant-store";
import { AssistantPanel, type AssistantPanelProps } from "./AssistantPanel";

/** Opens the dialog the way the navigation does: through the assistant store. */
function Harness({ ask }: Pick<AssistantPanelProps, "ask">) {
  const setOpen = useAssistantStore((state) => state.setOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ask the assistant
      </button>
      <AssistantPanel ask={ask} />
    </>
  );
}

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

async function openAndAsk(
  ask: AssistantPanelProps["ask"],
  question = "What is short on Thursday?",
) {
  render(<Harness ask={ask} />);
  await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
  await userEvent.type(screen.getByLabelText("Your question"), question);
  await userEvent.click(screen.getByRole("button", { name: "Ask" }));
}

describe("AssistantPanel", () => {
  beforeEach(() => resetAssistant());
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
    render(<Harness ask={ask} />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your question"), "   ");
    fireEvent.submit(screen.getByRole("button", { name: "Ask" }).closest("form")!);
    expect(ask).not.toHaveBeenCalled();
  });

  it("explains it needs a connection while offline", async () => {
    setOnline(false);
    render(<Harness ask={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByRole("status")).toHaveTextContent("The assistant needs a connection.");
    expect(screen.getByLabelText("Your question")).toBeDisabled();
  });

  it("opens as a dialog with the question focused, and closes again", async () => {
    setOnline(true);
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByRole("dialog", { name: "Assistant" })).toBeVisible();
    expect(screen.getByLabelText("Your question")).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the conversation while closed", async () => {
    setOnline(true);
    await openAndAsk(async (_history, onText) => {
      onText("Two crews are short.");
      return { kind: "done", status: "ok" };
    });
    expect(await screen.findByText("Two crews are short.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    expect(screen.getByText("Two crews are short.")).toBeVisible();
  });

  it("keeps the conversation and the draft question when the page changes", async () => {
    setOnline(true);
    await openAndAsk(async (_history, onText) => {
      onText("Two crews are short.");
      return { kind: "done", status: "ok" };
    });
    expect(await screen.findByText("Two crews are short.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your question"), "And Friday?");
    // Each page renders its own navigation, so a page change remounts the panel.
    cleanup();
    render(<Harness />);
    expect(screen.getByRole("dialog", { name: "Assistant" })).toBeVisible();
    expect(screen.getByText("Two crews are short.")).toBeVisible();
    expect(screen.getByLabelText("Your question")).toHaveValue("And Friday?");
  });

  it("closes with Escape and when the backdrop is clicked", async () => {
    setOnline(true);
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    const dialog = screen.getByRole("dialog");
    // Browsers close a modal dialog on Escape and fire `close`.
    act(() => (dialog as HTMLDialogElement).close());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ask the assistant" }));
    fireEvent.click(screen.getByRole("heading", { name: "Assistant" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("scrolls the latest answer into view", async () => {
    setOnline(true);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await openAndAsk(async () => ({ kind: "done", status: "ok" }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "end" }));
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });
});
