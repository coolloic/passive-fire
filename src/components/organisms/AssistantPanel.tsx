"use client";

import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { askAssistant, type AskResult } from "@/lib/assistant/client";
import type { ChatTurn } from "@/lib/assistant/run";
import { formatDateTime } from "@/lib/format/date";

interface AssistantPanelProps {
  /** Injected for tests. */
  ask?: (history: readonly ChatTurn[], onText: (delta: string) => void) => Promise<AskResult>;
}

function messageFor(result: Exclude<AskResult, { kind: "done" }>): string {
  if (result.kind === "rate_limited") {
    return result.retryAt
      ? `You've reached the limit of 20 questions an hour. Try again after ${formatDateTime(result.retryAt)}.`
      : "You've reached the limit of 20 questions an hour. Try again later.";
  }
  return MESSAGES[result.kind];
}

const MESSAGES: Record<Exclude<AskResult["kind"], "done" | "rate_limited">, string> = {
  not_configured: "The assistant isn't set up on this server.",
  disabled: "The assistant is switched off on this server.",
  unavailable: "The assistant isn't available for your account.",
  error: "Something went wrong. Try again.",
};

/**
 * A read-only assistant that answers questions about the team leader's planned work, streaming
 * its answer. It cannot change or send anything (spec FR-11).
 */
export function AssistantPanel({ ask = askAssistant }: AssistantPanelProps) {
  const id = useId();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    // The Ask button is disabled while answering or when the question is empty.
    if (!text) return;
    const conversation: ChatTurn[] = [...history, { role: "user", content: text }];
    setHistory([...conversation, { role: "assistant", content: "" }]);
    setQuestion("");
    setPending(true);
    setNotice(null);
    let answer = "";
    const result = await ask(conversation, (delta) => {
      answer += delta;
      setHistory([...conversation, { role: "assistant", content: answer }]);
    });
    if (result.kind === "done") {
      if (result.status === "refused") setNotice("The assistant can't help with that question.");
      if (result.status === "truncated")
        setNotice("The answer was cut short. Ask a narrower question.");
      setHistory([...conversation, { role: "assistant", content: answer || "(no answer)" }]);
    } else {
      setNotice(messageFor(result));
      setHistory(conversation.slice(0, -1));
      setQuestion(text);
    }
    setPending(false);
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="mb-4">
        Ask the assistant
      </Button>
    );
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="mb-4 flex max-w-3xl flex-col gap-3 rounded-lg border border-neutral-300 p-4 dark:border-neutral-600"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${id}-heading`} className="text-lg font-semibold">
          Assistant
        </h2>
        <Button variant="secondary" onClick={() => setOpen(false)}>
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
      {notice ? (
        <p role="alert" className="text-base text-red-700">
          {notice}
        </p>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={`${id}-question`} className="text-base font-medium">
          Your question
        </label>
        <TextArea
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
    </section>
  );
}
