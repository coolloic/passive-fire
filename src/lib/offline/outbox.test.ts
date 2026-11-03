import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OUTBOX_CHANGED_EVENT, OUTBOX_DB, outbox, closeOutbox, type OutboxItem } from "./outbox";

const item = (overrides: Partial<OutboxItem> = {}): OutboxItem => ({
  id: "e1",
  userId: "u1",
  plannedWorkId: "pw",
  label: "Fri 6 Nov · Crew Alpha",
  note: "",
  createdAt: "2026-11-03T10:00:00Z",
  status: "waiting",
  ...overrides,
});

describe("outbox", () => {
  afterEach(async () => {
    await closeOutbox();
    await deleteDB(OUTBOX_DB);
  });

  it("stores items per user, oldest first", async () => {
    await outbox.add(item({ id: "late", createdAt: "2026-11-03T12:00:00Z" }));
    await outbox.add(item({ id: "early", createdAt: "2026-11-03T09:00:00Z" }));
    await outbox.add(item({ id: "theirs", userId: "u2" }));
    expect((await outbox.list("u1")).map((entry) => entry.id)).toEqual(["early", "late"]);
    expect((await outbox.list("u2")).map((entry) => entry.id)).toEqual(["theirs"]);
    expect(await outbox.list("nobody")).toEqual([]);
  });

  it("updates and removes items", async () => {
    await outbox.add(item());
    await outbox.update(item({ status: "already_open", existingEscalationId: "open-1" }));
    expect(await outbox.list("u1")).toEqual([
      item({ status: "already_open", existingEscalationId: "open-1" }),
    ]);
    await outbox.remove("e1");
    expect(await outbox.list("u1")).toEqual([]);
  });

  it("keeps one entry per id when the same item is added twice", async () => {
    await outbox.add(item());
    await outbox.add(item({ note: "again" }));
    expect(await outbox.list("u1")).toHaveLength(1);
  });

  it("announces every change", async () => {
    const listener = vi.fn();
    window.addEventListener(OUTBOX_CHANGED_EVENT, listener);
    await outbox.add(item());
    await outbox.update(item({ status: "failed" }));
    await outbox.remove("e1");
    window.removeEventListener(OUTBOX_CHANGED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe("closeOutbox", () => {
  it("does nothing when no connection is open", async () => {
    await expect(closeOutbox()).resolves.toBeUndefined();
  });
});
