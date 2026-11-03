import type { BetaToolRunnerParams } from "@anthropic-ai/sdk/lib/tools/BetaToolRunner";
import { ASSISTANT_SYSTEM_PROMPT } from "./prompt";

/** The current default Claude model (technical design §7). */
export const ASSISTANT_MODEL = "claude-opus-5-5";
/** Caps answer length (spec AC-13.2) and tool round trips. */
export const MAX_ANSWER_TOKENS = 1500;
export const MAX_TOOL_ITERATIONS = 6;
/** Older turns are dropped so requests stay small (technical design §7). */
export const MAX_HISTORY_MESSAGES = 10;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type AssistantStatus = "ok" | "refused" | "truncated";

/** One model turn's stream, as yielded by the SDK's tool runner with `stream: true`. */
export interface TurnStream {
  on(event: "text", listener: (delta: string) => void): unknown;
  finalMessage(): Promise<{ stop_reason: string | null }>;
}

export type RunnerFactory = (params: BetaToolRunnerParams) => AsyncIterable<TurnStream>;

/** Keeps the latest turns, starting with a user turn as the API requires. */
export function trimHistory(history: readonly ChatTurn[]): ChatTurn[] {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((turn) => turn.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

export interface RunAssistantInput {
  createRunner: RunnerFactory;
  tools: BetaToolRunnerParams["tools"];
  history: readonly ChatTurn[];
  /** Volatile context kept out of the cached system prompt. */
  today: string;
  asOf: string;
  onText: (delta: string) => void;
}

/**
 * Answers the latest question with read-only tools, streaming text as it arrives. Thinking cannot
 * be disabled on this model; effort is kept low for chat. A safety refusal falls back to another
 * model server-side ("default" fallbacks); a final refusal or cut-off is reported in the status.
 */
export async function runAssistant(input: RunAssistantInput): Promise<AssistantStatus> {
  const runner = input.createRunner({
    model: ASSISTANT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    max_iterations: MAX_TOOL_ITERATIONS,
    stream: true,
    output_config: { effort: "low" },
    fallbacks: "default",
    betas: ["server-side-fallback-2026-07-01"],
    system: [
      { type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Today is ${input.today}. Data as of ${input.asOf}.` },
    ],
    tools: input.tools,
    messages: trimHistory(input.history).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
  });

  let stopReason: string | null = null;
  for await (const stream of runner) {
    stream.on("text", input.onText);
    stopReason = (await stream.finalMessage()).stop_reason;
  }
  if (stopReason === "refusal") return "refused";
  if (stopReason === "max_tokens") return "truncated";
  return "ok";
}
