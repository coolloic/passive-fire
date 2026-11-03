"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";

export type AddNoteOutcome =
  | { kind: "added" }
  | { kind: "invalid"; message: string }
  | { kind: "not_found" }
  | { kind: "error" };

interface NoteFormProps {
  escalationId: string;
  maxLength: number;
  action: (request: { escalationId: string; body: string }) => Promise<AddNoteOutcome>;
}

/** Adds a note to an open escalation, then refreshes the page to show it. */
export function NoteForm({ escalationId, maxLength, action }: NoteFormProps) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await action({ escalationId, body });
      if (result.kind === "added") {
        setBody("");
        router.refresh();
      } else if (result.kind === "invalid") {
        setError(result.message);
      } else if (result.kind === "not_found") {
        setError("This escalation is no longer available.");
      } else {
        setError("We couldn't add the note. Try again.");
      }
    } catch {
      setError("We couldn't add the note. Try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={id} className="text-base font-medium">
        Add a note
      </label>
      <TextArea
        id={id}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={maxLength}
      />
      {error ? (
        <p role="alert" className="text-base text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}
