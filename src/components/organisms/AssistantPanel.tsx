"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { askAssistant } from "@/lib/assistant/client";
import { formatDateTime } from "@/lib/format/date";
import { useAssistantStore, type Ask, type AssistantNotice } from "@/stores/assistant-store";

export interface AssistantPanelProps {
  /** Injected for tests. */
  ask?: Ask;
}

function messageFor(notice: AssistantNotice): string {
  switch (notice.kind) {
    case "refused":
      return "The assistant can't help with that question.";
    case "truncated":
      return "The answer was cut short. Ask a narrower question.";
    case "rate_limited":
      return notice.retryAt
        ? `You've reached the limit of 20 questions an hour. Try again after ${formatDateTime(notice.retryAt)}.`
        : "You've reached the limit of 20 questions an hour. Try again later.";
    case "not_configured":
      return "The assistant isn't set up on this server.";
    case "disabled":
      return "The assistant is switched off on this server.";
    case "unavailable":
      return "The assistant isn't available for your account.";
    case "error":
      return "Something went wrong. Try again.";
  }
}

/**
 * A read-only assistant that answers questions about the team leader's planned work, streaming
 * its answer. It cannot change or send anything (spec FR-11). Opens as a modal dialog: a full
 * screen sheet on phones, a side panel on larger screens. The conversation lives in the assistant
 * store, so it is kept while closed and when moving between pages.
 */
export function AssistantPanel({ ask = askAssistant }: AssistantPanelProps) {
  const id = useId();
  const online = useOnlineStatus();
  const dialog = useRef<HTMLDialogElement>(null);
  const questionField = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const open = useAssistantStore((state) => state.open);
  const history = useAssistantStore((state) => state.history);
  const question = useAssistantStore((state) => state.question);
  const pending = useAssistantStore((state) => state.pending);
  const notice = useAssistantStore((state) => state.notice);
  const setOpen = useAssistantStore((state) => state.setOpen);
  const setQuestion = useAssistantStore((state) => state.setQuestion);
  const send = useAssistantStore((state) => state.send);
  const close = () => setOpen(false);

  useEffect(() => {
    // Effects run after the ref is attached, so the dialog always exists here.
    const element = dialog.current as HTMLDialogElement;
    if (open && !element.open) {
      element.showModal();
      questionField.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  // Keep the latest answer in view while it streams.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [history]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(ask);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-heading`}
      onClose={close}
      // A click on the backdrop (outside the panel) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-neutral-950/50 md:ml-auto md:max-w-md md:border-l md:border-neutral-200 dark:md:border-neutral-700"
    >
      <div className="flex h-full flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-heading`} className="text-lg font-semibold">
            Assistant
          </h2>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ask about your planned work, shortages or deliveries. It can read your data but cannot
          change anything.
        </p>
        {!online ? (
          <p role="status" className="text-base">
            The assistant needs a connection.
          </p>
        ) : null}
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {history.length > 0 ? (
            <ol aria-live="polite" className="flex flex-col gap-2">
              {history.map((turn, index) => (
                <li
                  key={index}
                  className={`whitespace-pre-wrap rounded-md p-3 text-base ${
                    turn.role === "user"
                      ? "bg-neutral-100 dark:bg-neutral-800"
                      : "border border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>
                  {turn.content || "Thinking…"}
                </li>
              ))}
            </ol>
          ) : null}
          <div ref={end} />
        </div>
        {notice ? (
          <p role="alert" className="text-base text-red-700">
            {messageFor(notice)}
          </p>
        ) : null}
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={`${id}-question`} className="text-base font-medium">
            Your question
          </label>
          <TextArea
            ref={questionField}
            id={`${id}-question`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            maxLength={2000}
            disabled={!online}
          />
          <Button type="submit" disabled={!online || pending || question.trim() === ""}>
            {pending ? "Answering…" : "Ask"}
          </Button>
        </form>
      </div>
    </dialog>
  );
}
