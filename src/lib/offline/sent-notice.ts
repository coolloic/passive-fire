/**
 * Remembers, for this browser tab, how many saved escalations were just sent, so the "Sent"
 * confirmation survives the full page reload Next.js falls back to when the post-send refresh
 * fails on a shaky connection (possibly more than once). Only a count is stored, per user, and
 * it expires a minute after the last send.
 */
const KEY = "team-leader-outbox-sent";
export const SENT_NOTICE_MAX_AGE_MS = 60_000;

type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const defaultStorage = (): SessionStore => window.sessionStorage;

export function rememberSent(
  userId: string,
  count: number,
  now: number = Date.now(),
  storage: () => SessionStore = defaultStorage,
): void {
  try {
    storage().setItem(KEY, JSON.stringify({ userId, count, at: now }));
  } catch {
    // Storage unavailable (e.g. blocked): the notice simply won't survive a reload.
  }
}

/** Returns the remembered count for this user: 0 if none, expired or unreadable (then forgotten). */
export function recentlySent(
  userId: string,
  now: number = Date.now(),
  storage: () => SessionStore = defaultStorage,
): number {
  let store: SessionStore;
  try {
    store = storage();
  } catch {
    return 0;
  }
  try {
    const raw = store.getItem(KEY);
    if (raw === null) return 0;
    const value: unknown = JSON.parse(raw);
    const { userId: owner, count, at } = (value ?? {}) as Record<string, unknown>;
    const fresh = typeof at === "number" && now - at >= 0 && now - at <= SENT_NOTICE_MAX_AGE_MS;
    if (owner === userId && fresh && typeof count === "number" && count > 0) {
      return Math.floor(count);
    }
  } catch {
    // Unreadable: fall through and forget it.
  }
  try {
    store.removeItem(KEY);
  } catch {
    // Read-only storage: nothing more to do.
  }
  return 0;
}
