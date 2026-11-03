import { describe, expect, it, vi } from "vitest";
import type { Outbox, OutboxItem } from "./outbox";
import { syncOutbox, type Send, type SendOutcome } from "./sync";

const item = (id: string, overrides: Partial<OutboxItem> = {}): OutboxItem => ({
  id,
  userId: "u1",
  plannedWorkId: `pw-${id}`,
  label: "label",
  note: `note ${id}`,
  createdAt: "2026-11-03T10:00:00Z",
  status: "waiting",
  ...overrides,
});

function memoryOutbox(items: OutboxItem[]): Outbox & { items: Map<string, OutboxItem> } {
  const store = new Map(items.map((entry) => [entry.id, entry]));
  return {
    items: store,
    add: vi.fn(async (entry: OutboxItem) => void store.set(entry.id, entry)),
    list: vi.fn(async (userId: string) =>
      [...store.values()].filter((entry) => entry.userId === userId),
    ),
    update: vi.fn(async (entry: OutboxItem) => void store.set(entry.id, entry)),
    remove: vi.fn(async (id: string) => void store.delete(id)),
  };
}

const sendWith = (...outcomes: (SendOutcome | Error)[]): Send & ReturnType<typeof vi.fn> => {
  const fn = vi.fn();
  for (const outcome of outcomes) {
    if (outcome instanceof Error) fn.mockRejectedValueOnce(outcome);
    else fn.mockResolvedValueOnce(outcome);
  }
  return fn as Send & ReturnType<typeof vi.fn>;
};

describe("syncOutbox", () => {
  it("sends each item and removes those that were stored", async () => {
    const box = memoryOutbox([item("a"), item("b", { status: "failed", message: "x" })]);
    const send = sendWith(
      { kind: "created", escalationId: "a" },
      { kind: "duplicate", escalationId: "b" },
    );
    await expect(syncOutbox(box, "u1", send)).resolves.toEqual({ sent: 2, offline: false });
    expect(send).toHaveBeenCalledWith({ id: "a", plannedWorkId: "pw-a", note: "note a" });
    expect(box.items.size).toBe(0);
  });

  it("keeps an already-open refusal as a notice linking to the open escalation", async () => {
    const box = memoryOutbox([item("a")]);
    await syncOutbox(box, "u1", sendWith({ kind: "already_open", escalationId: "open-1" }));
    expect(box.items.get("a")).toMatchObject({
      status: "already_open",
      existingEscalationId: "open-1",
      message: "An escalation was already open for this planned work.",
    });
  });

  it.each<[SendOutcome, string]>([
    [{ kind: "invalid", message: "Keep the note short." }, "Keep the note short."],
    [{ kind: "not_found" }, "This planned work is no longer available."],
    [{ kind: "error" }, "Couldn't send. Try again."],
  ])("keeps a failed item with a reason (%o)", async (outcome, message) => {
    const box = memoryOutbox([item("a")]);
    await expect(syncOutbox(box, "u1", sendWith(outcome))).resolves.toEqual({
      sent: 0,
      offline: false,
    });
    expect(box.items.get("a")).toMatchObject({ status: "failed", message });
  });

  it("stops at the first network failure and leaves the rest waiting", async () => {
    const box = memoryOutbox([item("a"), item("b"), item("c")]);
    const send = sendWith({ kind: "created", escalationId: "a" }, new TypeError("Failed to fetch"));
    await expect(syncOutbox(box, "u1", send)).resolves.toEqual({ sent: 1, offline: true });
    expect([...box.items.keys()]).toEqual(["b", "c"]);
    expect(box.items.get("b")?.status).toBe("waiting");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("skips notices and other users' items", async () => {
    const box = memoryOutbox([
      item("notice", { status: "already_open" }),
      item("theirs", { userId: "u2" }),
    ]);
    const send = sendWith();
    await expect(syncOutbox(box, "u1", send)).resolves.toEqual({ sent: 0, offline: false });
    expect(send).not.toHaveBeenCalled();
  });
});
