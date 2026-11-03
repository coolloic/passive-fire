import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftOutcome } from "@/lib/assistant/draft-client";
import { EscalationForm, type RaiseEscalationOutcome } from "./EscalationForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ID = "a0000000-0000-4000-8007-000000000001";
const PW = "pw-1";

function setup(
  outcome: RaiseEscalationOutcome | Error = { kind: "created", escalationId: ID },
  maxNoteLength = 1000,
) {
  const action = vi.fn(async () => {
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  render(
    <EscalationForm
      plannedWorkId={PW}
      lines={["Short by 10 × Collar"]}
      maxNoteLength={maxNoteLength}
      action={action}
      createId={() => ID}
    />,
  );
  return {
    action,
    note: screen.getByLabelText("Note for the project manager (optional)"),
    send: screen.getByRole("button", { name: "Send escalation" }),
  };
}

describe("EscalationForm", () => {
  beforeEach(() => push.mockClear());

  it("previews what will be escalated", () => {
    setup();
    expect(screen.getByRole("region", { name: "What will be escalated" })).toHaveTextContent(
      "Short by 10 × Collar",
    );
  });

  it("sends the device id, planned work and note, then opens the escalation", async () => {
    const { action, note, send } = setup();
    await userEvent.type(note, "Need by Friday");
    await userEvent.click(send);
    expect(action).toHaveBeenCalledWith({ id: ID, plannedWorkId: PW, note: "Need by Friday" });
    expect(push).toHaveBeenCalledWith(`/escalations/${ID}`);
  });

  it("opens the escalation for a duplicate submission too", async () => {
    const { send } = setup({ kind: "duplicate", escalationId: ID });
    await userEvent.click(send);
    expect(push).toHaveBeenCalledWith(`/escalations/${ID}`);
  });

  it("reuses the same id when submitted again", async () => {
    const { action, send } = setup({ kind: "error" });
    await userEvent.click(send);
    await userEvent.click(send);
    expect(action.mock.calls.map((call) => (call as unknown as [{ id: string }])[0].id)).toEqual([
      ID,
      ID,
    ]);
  });

  it("confirms an escalation saved on the device for later", async () => {
    const { send } = setup({ kind: "queued" });
    await userEvent.click(send);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved on this device. It will be sent when you're back online.",
    );
    expect(screen.queryByRole("button", { name: "Send escalation" })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("links to the escalation that is already open", async () => {
    const { send } = setup({ kind: "already_open", escalationId: "open-1" });
    await userEvent.click(send);
    expect(await screen.findByRole("link", { name: "View open escalation" })).toHaveAttribute(
      "href",
      "/escalations/open-1",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it.each<[RaiseEscalationOutcome | Error, string]>([
    [
      { kind: "invalid", message: "Keep the note to 1000 characters or fewer." },
      "Keep the note to 1000 characters or fewer.",
    ],
    [{ kind: "not_found" }, "This planned work is no longer available."],
    [{ kind: "error" }, "We couldn't send the escalation. Try again."],
    [new Error("network"), "We couldn't send the escalation. Try again."],
  ])("shows an error and keeps the note (%#)", async (outcome, message) => {
    const { note, send } = setup(outcome);
    await userEvent.type(note, "Keep me");
    await userEvent.click(send);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(note).toHaveValue("Keep me");
    expect(send).toBeEnabled();
  });

  it("counts characters and blocks a note that is too long", async () => {
    const { action, note, send } = setup(undefined, 5);
    await userEvent.type(note, "123456");
    expect(screen.getByText("6 / 5 characters")).toBeInTheDocument();
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(send).toBeDisabled();
    fireEvent.submit(send.closest("form")!);
    expect(action).not.toHaveBeenCalled();
  });

  it("disables sending while the request is in flight", async () => {
    let finish: (value: RaiseEscalationOutcome) => void = () => {};
    const action = vi.fn(
      () => new Promise<RaiseEscalationOutcome>((resolve) => (finish = resolve)),
    );
    render(
      <EscalationForm
        plannedWorkId={PW}
        lines={[]}
        maxNoteLength={1000}
        action={action}
        createId={() => ID}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send escalation" }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    finish({ kind: "error" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send escalation" })).toBeEnabled(),
    );
  });

  it("uses the browser's UUID generator by default", async () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue(ID);
    const action = vi.fn(async (): Promise<RaiseEscalationOutcome> => ({ kind: "error" }));
    render(<EscalationForm plannedWorkId={PW} lines={[]} maxNoteLength={1000} action={action} />);
    await userEvent.click(screen.getByRole("button", { name: "Send escalation" }));
    expect(action).toHaveBeenCalledWith(expect.objectContaining({ id: ID }));
    randomUUID.mockRestore();
  });
});

describe("EscalationForm drafting", () => {
  afterEach(() => vi.restoreAllMocks());

  function renderWithDraft(outcome: DraftOutcome, online = true) {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
    const requestDraft = vi.fn(async () => outcome);
    const action = vi.fn(async (): Promise<RaiseEscalationOutcome> => ({ kind: "error" }));
    render(
      <EscalationForm
        plannedWorkId={PW}
        lines={[]}
        maxNoteLength={1000}
        action={action}
        createId={() => ID}
        allowDraft
        requestDraft={requestDraft}
      />,
    );
    return { requestDraft, action };
  }

  it("fills the note with a draft that can be edited, without sending", async () => {
    const { requestDraft, action } = renderWithDraft({
      kind: "ok",
      draft: "Please send 10 collars by Thursday.",
    });
    await userEvent.click(screen.getByRole("button", { name: "Draft with AI" }));
    const note = screen.getByLabelText("Note for the project manager (optional)");
    expect(note).toHaveValue("Please send 10 collars by Thursday.");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Draft added. Check and edit it before sending.",
    );
    expect(requestDraft).toHaveBeenCalledWith(PW);
    expect(action).not.toHaveBeenCalled();
    await userEvent.type(note, " Thanks.");
    expect(note).toHaveValue("Please send 10 collars by Thursday. Thanks.");
  });

  it.each<[DraftOutcome, string]>([
    [
      { kind: "not_configured" },
      "The assistant isn't set up on this server. Write the note yourself.",
    ],
    [
      { kind: "disabled" },
      "The assistant is switched off on this server. Write the note yourself.",
    ],
    [
      { kind: "rate_limited", retryAt: "2026-11-03T15:00:00Z" },
      "You've reached the assistant's hourly limit. Try again after 3 Nov, 15:00.",
    ],
    [
      { kind: "rate_limited", retryAt: null },
      "You've reached the assistant's hourly limit. Try again later.",
    ],
    [{ kind: "no_draft" }, "The assistant couldn't draft this note. Write it yourself."],
    [{ kind: "error" }, "We couldn't get a draft. Try again or write the note yourself."],
  ])(
    "explains when no draft is available (%o) and keeps the form usable",
    async (outcome, message) => {
      renderWithDraft(outcome);
      await userEvent.click(screen.getByRole("button", { name: "Draft with AI" }));
      expect(screen.getByRole("status")).toHaveTextContent(message);
      expect(screen.getByRole("button", { name: "Send escalation" })).toBeEnabled();
    },
  );

  it("shows progress while drafting", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    let finish: (outcome: DraftOutcome) => void = () => {};
    const requestDraft = vi.fn(() => new Promise<DraftOutcome>((resolve) => (finish = resolve)));
    render(
      <EscalationForm
        plannedWorkId={PW}
        lines={[]}
        maxNoteLength={1000}
        action={vi.fn()}
        allowDraft
        requestDraft={requestDraft}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Draft with AI" }));
    expect(screen.getByRole("button", { name: "Drafting…" })).toBeDisabled();
    finish({ kind: "error" });
    expect(await screen.findByRole("button", { name: "Draft with AI" })).toBeEnabled();
  });

  it("hides drafting offline and unless allowed", () => {
    renderWithDraft({ kind: "error" }, false);
    expect(screen.queryByRole("button", { name: "Draft with AI" })).not.toBeInTheDocument();
  });

  it("is not offered by default", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(<EscalationForm plannedWorkId={PW} lines={[]} maxNoteLength={1000} action={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Draft with AI" })).not.toBeInTheDocument();
  });
});
