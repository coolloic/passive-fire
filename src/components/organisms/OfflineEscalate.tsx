"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { outbox as defaultOutbox, type Outbox } from "@/lib/offline/outbox";
import { EscalationForm, type RaiseEscalationOutcome } from "./EscalationForm";

interface OfflineEscalateProps {
  plannedWorkId: string;
  /** e.g. "Fri 6 Nov · Crew Alpha", shown in the outbox. */
  label: string;
  /** What the escalation will record, in plain language. */
  lines: readonly string[];
  userId: string;
  maxNoteLength: number;
  /** The online control (a link to the escalate page). */
  children: ReactNode;
  /** Injected for tests. */
  store?: Pick<Outbox, "add">;
}

/**
 * Online: the usual Escalate link. Offline: an inline form that saves the escalation on this
 * device; the outbox sends it when the connection returns (spec AC-10.1).
 */
export function OfflineEscalate({
  plannedWorkId,
  label,
  lines,
  userId,
  maxNoteLength,
  children,
  store = defaultOutbox,
}: OfflineEscalateProps) {
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);

  if (online) return <>{children}</>;

  async function queue(request: { id: string; note: string }): Promise<RaiseEscalationOutcome> {
    await store.add({
      id: request.id,
      userId,
      plannedWorkId,
      label,
      note: request.note,
      createdAt: new Date().toISOString(),
      status: "waiting",
    });
    return { kind: "queued" };
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-1">
        <Button onClick={() => setOpen(true)}>Escalate offline</Button>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          It will be saved on this device and sent when you&apos;re back online.
        </p>
      </div>
    );
  }
  return (
    <EscalationForm
      plannedWorkId={plannedWorkId}
      lines={lines}
      maxNoteLength={maxNoteLength}
      action={queue}
    />
  );
}
