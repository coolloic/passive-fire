import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { checkAssistantAccess, checkAssistantAllowance, jsonResponse } from "./guard";
import { createAssistantTools } from "./tools";
import { MAX_HISTORY_MESSAGES, runAssistant, type RunnerFactory } from "./run";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { formatDateTime, todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES * 2)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be a question."),
});

/** Builds the SDK tool runner. */
export function createRunnerFactory(apiKey: string): RunnerFactory {
  const client = new Anthropic({ apiKey });
  return (params) => client.beta.messages.toolRunner({ ...params, stream: true });
}

/**
 * Streams an assistant answer as newline-delimited JSON: `text` deltas, then `done` with a status
 * (or `error`). Team leaders only; the tools read data as the signed-in user (spec FR-11).
 */
export async function handleAssistantRequest(
  request: Request,
  runnerFactory: (apiKey: string) => RunnerFactory = createRunnerFactory,
): Promise<Response> {
  const checked = await checkAssistantAccess();
  if ("denied" in checked) return checked.denied;
  const { access } = checked;

  let body: z.infer<typeof requestSchema>;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return jsonResponse(400, { error: "invalid_request" });
    body = parsed.data;
  } catch {
    return jsonResponse(400, { error: "invalid_request" });
  }

  const limited = await checkAssistantAllowance(access);
  if (limited) return limited;

  const now = new Date();
  const context = {
    source: createSupabaseReadinessDataSource(access.client),
    today: todayIso(now),
    asOf: formatDateTime(now.toISOString()),
  };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const status = await runAssistant({
          createRunner: runnerFactory(access.apiKey),
          tools: createAssistantTools(context),
          history: body.messages,
          today: context.today,
          asOf: context.asOf,
          onText: (text) => send({ type: "text", text }),
        });
        send({ type: "done", status });
      } catch (error) {
        logger.error("Assistant request failed", error, { userId: access.user.id });
        send({ type: "error" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
