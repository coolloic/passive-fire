import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ASSISTANT_MODEL } from "./run";

/** Short drafts only: a note to the project manager, not an essay (spec FR-12). */
export const MAX_DRAFT_TOKENS = 400;

export interface EscalationFacts {
  date: string;
  crew: string;
  site: string;
  /** What the escalation will record, in plain language (server-computed). */
  lines: readonly string[];
}

export type DraftClient = (
  params: MessageCreateParamsNonStreaming,
) => Promise<Pick<BetaMessage, "content" | "stop_reason">>;

export type DraftResult = { kind: "ok"; draft: string } | { kind: "refused" } | { kind: "empty" };

const DRAFT_SYSTEM_PROMPT = `You write short escalation notes from a passive fire team leader to their project manager.
Use only the facts given. Say what is short or unknown for which planned work, and what the team leader needs (stock before the work date, or a decision).
Do not suggest that another solution is compliant or equivalent; a project manager must approve any change.
Plain text, at most 80 words, no greeting line or signature.`;

/** Drafts a note from the escalation's facts. The team leader reviews it; nothing is sent here. */
export async function draftEscalationNote(
  create: DraftClient,
  facts: EscalationFacts,
): Promise<DraftResult> {
  const message = await create({
    model: ASSISTANT_MODEL,
    max_tokens: MAX_DRAFT_TOKENS,
    output_config: { effort: "low" },
    fallbacks: "default",
    betas: ["server-side-fallback-2026-07-01"],
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Facts:\n${JSON.stringify(facts, null, 2)}\n\nWrite the note.` },
    ],
  });
  if (message.stop_reason === "refusal") return { kind: "refused" };
  const draft = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  return draft ? { kind: "ok", draft } : { kind: "empty" };
}
