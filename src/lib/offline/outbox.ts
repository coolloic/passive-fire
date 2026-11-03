import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/** An escalation raised offline, waiting on this device until it can be sent (spec FR-10). */
export interface OutboxItem {
  /** Created on the device; the server stores it once however often it is sent (AC-10.3). */
  id: string;
  /** Only this user's session sends it, so a shared device never sends someone else's items. */
  userId: string;
  plannedWorkId: string;
  /** e.g. "Fri 6 Nov · Crew Alpha", shown while it waits. */
  label: string;
  note: string;
  createdAt: string;
  status: "waiting" | "failed" | "already_open";
  message?: string;
  /** Set when the server already had an Open escalation for the planned work (AC-10.5). */
  existingEscalationId?: string;
}

interface OutboxSchema extends DBSchema {
  outbox: { key: string; value: OutboxItem; indexes: { byUser: string } };
}

export interface Outbox {
  add(item: OutboxItem): Promise<void>;
  list(userId: string): Promise<OutboxItem[]>;
  update(item: OutboxItem): Promise<void>;
  remove(id: string): Promise<void>;
}

export const OUTBOX_DB = "team-leader-outbox";
/** Fired on window whenever the outbox changes, so open views can refresh. */
export const OUTBOX_CHANGED_EVENT = "outbox-changed";

function notifyChanged(): void {
  // The outbox is only used in the browser (client components).
  window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
}

let database: Promise<IDBPDatabase<OutboxSchema>> | undefined;

function open(): Promise<IDBPDatabase<OutboxSchema>> {
  database ??= openDB<OutboxSchema>(OUTBOX_DB, 1, {
    upgrade(db) {
      db.createObjectStore("outbox", { keyPath: "id" }).createIndex("byUser", "userId");
    },
  });
  return database;
}

/** Closes and forgets the connection, so the database can be deleted (used by tests). */
export async function closeOutbox(): Promise<void> {
  const current = database;
  database = undefined;
  if (current) (await current).close();
}

/** The IndexedDB outbox. Items are listed oldest first. */
export const outbox: Outbox = {
  async add(item) {
    await (await open()).put("outbox", item);
    notifyChanged();
  },
  async list(userId) {
    const items = await (await open()).getAllFromIndex("outbox", "byUser", userId);
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async update(item) {
    await (await open()).put("outbox", item);
    notifyChanged();
  },
  async remove(id) {
    await (await open()).delete("outbox", id);
    notifyChanged();
  },
};
