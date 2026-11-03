import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OUTBOX_CHANGED_EVENT, type Outbox, type OutboxItem } from "@/lib/offline/outbox";
import type { Send } from "@/lib/offline/sync";
import { OutboxPanel } from "./OutboxPanel";

const refresh = vi.fn();
// Next.js returns a stable router instance; mirror that.
const router = { refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const item = (id: string, overrides: Partial<OutboxItem> = {}): OutboxItem => ({
  id,
  userId: "u1",
  plannedWorkId: `pw-${id}`,
  label: `Fri 6 Nov · Crew ${id}`,
  note: "",
  createdAt: "2026-11-03T10:00:00Z",
  status: "waiting",
  ...overrides,
});

function memoryOutbox(items: OutboxItem[]): Outbox {
  const store = new Map(items.map((entry) => [entry.id, entry]));
  const changed = () => window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
  return {
    add: vi.fn(async (entry: OutboxItem) => {
      store.set(entry.id, entry);
      changed();
    }),
    list: vi.fn(async () => [...store.values()]),
    update: vi.fn(async (entry: OutboxItem) => {
      store.set(entry.id, entry);
      changed();
    }),
    remove: vi.fn(async (id: string) => {
      store.delete(id);
      changed();
    }),
  };
}

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("OutboxPanel", () => {
  beforeEach(() => refresh.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it("renders nothing when the outbox is empty", async () => {
    setOnline(true);
    const store = memoryOutbox([]);
    const { container } = render(<OutboxPanel userId="u1" send={vi.fn()} store={store} />);
    await waitFor(() => expect(store.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("lists escalations waiting while offline, with Retry disabled", async () => {
    setOnline(false);
    const send = vi.fn();
    render(<OutboxPanel userId="u1" send={send} store={memoryOutbox([item("A")])} />);
    expect(await screen.findByText("Fri 6 Nov · Crew A")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Waiting to send" })).toHaveTextContent(
      "Waiting to send",
    );
    expect(screen.getByRole("button", { name: "Retry now" })).toBeDisabled();
    expect(screen.getByText("They will be sent when you're back online.")).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends automatically when the connection returns, then refreshes the page", async () => {
    setOnline(false);
    const send: Send = vi.fn(async () => ({ kind: "created" as const, escalationId: "A" }));
    render(<OutboxPanel userId="u1" send={send} store={memoryOutbox([item("A")])} />);
    await screen.findByText("Fri 6 Nov · Crew A");
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sent 1 escalation saved on this device.",
    );
    expect(send).toHaveBeenCalledWith({ id: "A", plannedWorkId: "pw-A", note: "" });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText("Fri 6 Nov · Crew A")).not.toBeInTheDocument();
  });

  it("sends on open when online and counts several", async () => {
    setOnline(true);
    const send: Send = vi.fn(async () => ({ kind: "duplicate" as const, escalationId: "x" }));
    render(<OutboxPanel userId="u1" send={send} store={memoryOutbox([item("A"), item("B")])} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sent 2 escalations saved on this device.",
    );
  });

  it("shows why an item failed and lets the user retry", async () => {
    setOnline(true);
    const send = vi
      .fn<Send>()
      .mockResolvedValueOnce({ kind: "error" })
      .mockResolvedValueOnce({ kind: "created", escalationId: "A" });
    render(<OutboxPanel userId="u1" send={send} store={memoryOutbox([item("A")])} />);
    expect(await screen.findByText(/Couldn't send\. Try again\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry now" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sent 1 escalation");
  });

  it("explains an escalation that was already open, links to it and can be dismissed", async () => {
    setOnline(true);
    const send: Send = vi.fn(async () => ({
      kind: "already_open" as const,
      escalationId: "open-1",
    }));
    render(<OutboxPanel userId="u1" send={send} store={memoryOutbox([item("A")])} />);
    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("An escalation was already open for this planned work.");
    expect(screen.getByRole("link", { name: "View open escalation" })).toHaveAttribute(
      "href",
      "/escalations/open-1",
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("shows a notice without a link when the open escalation is unknown", async () => {
    setOnline(false);
    render(
      <OutboxPanel
        userId="u1"
        send={vi.fn()}
        store={memoryOutbox([item("A", { status: "already_open", message: "Already open." })])}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Already open.");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not start a second send while one is running", async () => {
    setOnline(true);
    let finish: () => void = () => {};
    const first = vi.fn<Send>(
      () =>
        new Promise((resolve) => (finish = () => resolve({ kind: "created", escalationId: "A" }))),
    );
    const second = vi.fn<Send>(async () => ({ kind: "created", escalationId: "A" }));
    const store = memoryOutbox([item("A")]);
    const { rerender } = render(<OutboxPanel userId="u1" send={first} store={store} />);
    await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled();

    // A new `send` re-runs the effect while the first send is still in flight.
    rerender(<OutboxPanel userId="u1" send={second} store={store} />);
    finish();
    await screen.findByRole("status");
    expect(second).not.toHaveBeenCalled();
  });

  it("refreshes its list when the outbox changes elsewhere", async () => {
    setOnline(false);
    const store = memoryOutbox([]);
    render(<OutboxPanel userId="u1" send={vi.fn()} store={store} />);
    await act(async () => {
      await store.add(item("New"));
    });
    expect(await screen.findByText("Fri 6 Nov · Crew New")).toBeInTheDocument();
  });

  it("uses the device outbox by default", async () => {
    setOnline(false);
    const { container } = render(<OutboxPanel userId="nobody" send={vi.fn()} />);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(container).toBeEmptyDOMElement();
  });
});
