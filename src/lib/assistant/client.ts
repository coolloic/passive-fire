import { z } from "zod";
import type { AssistantStatus, ChatTurn } from "./run";

export const ASSISTANT_ENDPOINT = "/api/assistant";

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("done"), status: z.enum(["ok", "refused", "truncated"]) }),
  z.object({ type: z.literal("error") }),
]);

export type AskResult =
  | { kind: "done"; status: AssistantStatus }
  | { kind: "not_configured" }
  | { kind: "unavailable" }
  | { kind: "error" };

/**
 * Sends the conversation to the assistant route and streams the answer through `onText`.
 * The route replies with newline-delimited JSON events.
 */
export async function askAssistant(
  history: readonly ChatTurn[],
  onText: (delta: string) => void,
  fetcher: typeof fetch = fetch,
): Promise<AskResult> {
  let response: Response;
  try {
    response = await fetcher(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 503) return { kind: "not_configured" };
  if (response.status === 401 || response.status === 403) return { kind: "unavailable" };
  if (!response.ok || !response.body) return { kind: "error" };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AskResult = { kind: "error" };
  const handle = (line: string) => {
    if (line.trim() === "") return;
    const parsed = eventSchema.safeParse(JSON.parse(line));
    if (!parsed.success) return;
    if (parsed.data.type === "text") onText(parsed.data.text);
    else if (parsed.data.type === "done") result = { kind: "done", status: parsed.data.status };
    else result = { kind: "error" };
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // split() always returns at least one element: the unfinished last line.
      buffer = lines.pop()!;
      lines.forEach(handle);
    }
    handle(buffer);
  } catch {
    return { kind: "error" };
  }
  return result;
}
