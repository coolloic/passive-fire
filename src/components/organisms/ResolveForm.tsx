"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextArea } from "@/components/atoms/TextArea";
import type { EscalationResolution } from "@/lib/data/escalation-repository";

export type ResolveOutcome =
  | { kind: "resolved" }
  | { kind: "not_open" }
  | { kind: "invalid"; message: string }
  | { kind: "not_found" }
  | { kind: "error" };

export interface ResolveRequest {
  escalationId: string;
  resolution: EscalationResolution | "";
  comment: string;
}

interface ResolveFormProps {
  escalationId: string;
  options: readonly { value: EscalationResolution; label: string }[];
  maxCommentLength: number;
  action: (request: ResolveRequest) => Promise<ResolveOutcome>;
}

/** Lets a project manager resolve an escalation with a required resolution (spec AC-8.3). */
export function ResolveForm({ escalationId, options, maxCommentLength, action }: ResolveFormProps) {
  const router = useRouter();
  const id = useId();
  const [resolution, setResolution] = useState<EscalationResolution | "">("");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await action({ escalationId, resolution, comment });
      if (result.kind === "resolved" || result.kind === "not_open") {
        // Either way the escalation is now resolved; show its latest state.
        router.refresh();
        if (result.kind === "not_open") setError("Someone else already resolved this escalation.");
      } else if (result.kind === "invalid") {
        setError(result.message);
      } else if (result.kind === "not_found") {
        setError("This escalation is no longer available.");
      } else {
        setError("We couldn't resolve the escalation. Try again.");
      }
    } catch {
      setError("We couldn't resolve the escalation. Try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-medium">Resolution</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className="-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base transition-colors hover:bg-neutral-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-red-700 dark:hover:bg-neutral-900"
          >
            <input
              type="radio"
              name={`${id}-resolution`}
              value={option.value}
              checked={resolution === option.value}
              onChange={() => setResolution(option.value)}
              className="h-5 w-5 accent-red-700"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-comment`} className="text-base font-medium">
        Comment for the team leader (optional)
      </label>
      <TextArea
        id={`${id}-comment`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        maxLength={maxCommentLength}
      />
      {error ? (
        <p role="alert" className="text-base text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Resolving…" : "Resolve escalation"}
      </Button>
    </form>
  );
}
