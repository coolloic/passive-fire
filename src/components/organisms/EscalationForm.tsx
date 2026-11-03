"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";
import { EscalationLineList } from "@/components/molecules/EscalationLineList";
import type { SendOutcome } from "@/lib/offline/sync";
import { TextLink } from "@/components/atoms/TextLink";

/** What sending to the server can return, plus "queued" when saved on the device instead. */
export type RaiseEscalationOutcome = SendOutcome | { kind: "queued" };

export interface RaiseEscalationRequest {
  id: string;
  plannedWorkId: string;
  note: string;
}

interface EscalationFormProps {
  plannedWorkId: string;
  lines: readonly string[];
  maxNoteLength: number;
  action: (request: RaiseEscalationRequest) => Promise<RaiseEscalationOutcome>;
  /** Injected for tests; defaults to the browser's UUID generator. */
  createId?: () => string;
}

/**
 * Raises an escalation. The id is created once per form so a retried submission is stored
 * only once (spec AC-10.3). The note is kept if anything goes wrong (spec AC-7.5).
 */
export function EscalationForm({
  plannedWorkId,
  lines,
  maxNoteLength,
  action,
  createId = () => crypto.randomUUID(),
}: EscalationFormProps) {
  const router = useRouter();
  const noteId = useId();
  const [escalationId] = useState(createId);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const tooLong = note.length > maxNoteLength;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooLong) return;
    setPending(true);
    setError(null);
    try {
      const result = await action({ id: escalationId, plannedWorkId, note });
      if (result.kind === "created" || result.kind === "duplicate") {
        router.push(`/escalations/${result.escalationId}`);
        return;
      }
      if (result.kind === "queued") setQueued(true);
      else if (result.kind === "already_open") setOpenId(result.escalationId);
      else if (result.kind === "invalid") setError(result.message);
      else if (result.kind === "not_found") setError("This planned work is no longer available.");
      else setError("We couldn't send the escalation. Try again.");
    } catch {
      setError("We couldn't send the escalation. Try again.");
    }
    setPending(false);
  }

  if (queued) {
    return (
      <p
        role="status"
        className="rounded-md border border-amber-600 bg-amber-50 p-3 text-base text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      >
        Saved on this device. It will be sent when you&apos;re back online.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <section aria-labelledby={`${noteId}-lines`} className="flex flex-col gap-2">
        <h2 id={`${noteId}-lines`} className="text-lg font-semibold">
          What will be escalated
        </h2>
        <EscalationLineList lines={lines} />
      </section>
      <div className="flex flex-col gap-1">
        <label htmlFor={noteId} className="text-base font-medium">
          Note for the project manager (optional)
        </label>
        <TextArea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          aria-describedby={`${noteId}-count`}
          aria-invalid={tooLong}
        />
        <p
          id={`${noteId}-count`}
          className={`text-sm ${tooLong ? "text-red-700" : "text-neutral-600 dark:text-neutral-400"}`}
        >
          {note.length} / {maxNoteLength} characters
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-base text-red-700">
          {error}
        </p>
      ) : null}
      {openId ? (
        <p role="alert" className="text-base">
          An escalation is already open for this planned work.{" "}
          <TextLink href={`/escalations/${openId}`} variant="inline">
            View open escalation
          </TextLink>
        </p>
      ) : null}
      <Button type="submit" disabled={pending || tooLong}>
        {pending ? "Sending…" : "Send escalation"}
      </Button>
    </form>
  );
}
