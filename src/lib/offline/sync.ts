import type { Outbox, OutboxItem } from "./outbox";

export type SendOutcome =
  | { kind: "created"; escalationId: string }
  | { kind: "duplicate"; escalationId: string }
  | { kind: "already_open"; escalationId: string }
  | { kind: "invalid"; message: string }
  | { kind: "not_found" }
  | { kind: "error" };

export type Send = (request: {
  id: string;
  plannedWorkId: string;
  note: string;
}) => Promise<SendOutcome>;

export interface SyncResult {
  sent: number;
  /** True when sending stopped because the network is unavailable. */
  offline: boolean;
}

function outcomeUpdate(
  item: OutboxItem,
  outcome: Exclude<SendOutcome, { kind: "created" | "duplicate" }>,
): OutboxItem {
  switch (outcome.kind) {
    case "already_open":
      return {
        ...item,
        status: "already_open",
        existingEscalationId: outcome.escalationId,
        message: "An escalation was already open for this planned work.",
      };
    case "invalid":
      return { ...item, status: "failed", message: outcome.message };
    case "not_found":
      return { ...item, status: "failed", message: "This planned work is no longer available." };
    case "error":
      return { ...item, status: "failed", message: "Couldn't send. Try again." };
  }
}

/**
 * Sends this user's waiting and failed escalations, oldest first. Sent items (created, or already
 * stored on an earlier attempt) leave the outbox; refusals stay with an explanation. A network
 * failure stops the run and leaves everything else untouched for the next attempt.
 */
export async function syncOutbox(outbox: Outbox, userId: string, send: Send): Promise<SyncResult> {
  const items = (await outbox.list(userId)).filter((item) => item.status !== "already_open");
  let sent = 0;
  for (const item of items) {
    let outcome: SendOutcome;
    try {
      outcome = await send({ id: item.id, plannedWorkId: item.plannedWorkId, note: item.note });
    } catch {
      return { sent, offline: true };
    }
    if (outcome.kind === "created" || outcome.kind === "duplicate") {
      await outbox.remove(item.id);
      sent += 1;
    } else {
      await outbox.update(outcomeUpdate(item, outcome));
    }
  }
  return { sent, offline: false };
}
