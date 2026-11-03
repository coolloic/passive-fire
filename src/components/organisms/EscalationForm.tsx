"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";
import { EscalationLineList } from "@/components/molecules/EscalationLineList";
import {
  requestDraft as defaultRequestDraft,
  type DraftOutcome,
} from "@/lib/assistant/draft-client";
import { formatDateTime } from "@/lib/format/date";
import { useOnlineStatus } from "@/hooks/use-online-status";
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
  /** Offers "Draft with AI" (online only). The draft only fills the note; nothing is sent. */
  allowDraft?: boolean;
  /** Injected for tests. */
  requestDraft?: (plannedWorkId: string) => Promise<DraftOutcome>;
}

function draftProblem(outcome: Exclude<DraftOutcome, { kind: "ok" }>): string {
  switch (outcome.kind) {
    case "not_configured":
      return "The assistant isn't set up on this server. Write the note yourself.";
    case "disabled":
      return "The assistant is switched off on this server. Write the note yourself.";
    case "rate_limited":
      return outcome.retryAt
        ? `You've reached the assistant's hourly limit. Try again after ${formatDateTime(outcome.retryAt)}.`
        : "You've reached the assistant's hourly limit. Try again later.";
    case "no_draft":
      return "The assistant couldn't draft this note. Write it yourself.";
    case "error":
      return "We couldn't get a draft. Try again or write the note yourself.";
  }
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
  allowDraft = false,
  requestDraft = defaultRequestDraft,
}: EscalationFormProps) {
  const online = useOnlineStatus();
  const [drafting, setDrafting] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
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

  async function draft() {
    setDrafting(true);
    setDraftNotice(null);
    const outcome = await requestDraft(plannedWorkId);
    if (outcome.kind === "ok") {
      setNote(outcome.draft);
      setDraftNotice("Draft added. Check and edit it before sending.");
    } else {
      setDraftNotice(draftProblem(outcome));
    }
    setDrafting(false);
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
      {allowDraft && online ? (
        <div className="flex flex-col gap-1">
          <Button variant="secondary" disabled={drafting || pending} onClick={() => void draft()}>
            {drafting ? "Drafting…" : "Draft with AI"}
          </Button>
          {draftNotice ? (
            <p role="status" className="text-sm text-neutral-700 dark:text-neutral-300">
              {draftNotice}
            </p>
          ) : null}
        </div>
      ) : null}
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
