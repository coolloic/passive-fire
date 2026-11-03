import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createAssistantTools } from "./tools";
import { MAX_HISTORY_MESSAGES, runAssistant, type RunnerFactory } from "./run";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { createSupabaseAssistantUsageRepository } from "@/lib/data/assistant-usage-repository";
import { getAnthropicApiKey, isAssistantEnabled } from "@/lib/env.server";
import { formatDateTime, todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

/** Spec AC-13.1. */
export const ASSISTANT_MESSAGES_PER_HOUR = 20;

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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
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
  const user = await getCurrentUser();
  if (!user) return json(401, { error: "not_signed_in" });
  if (user.role !== "team_leader") return json(403, { error: "forbidden" });

  if (!isAssistantEnabled()) return json(503, { error: "disabled" });
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return json(503, { error: "not_configured" });

  let body: z.infer<typeof requestSchema>;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return json(400, { error: "invalid_request" });
    body = parsed.data;
  } catch {
    return json(400, { error: "invalid_request" });
  }

  const client = createServerSupabaseClient();
  try {
    const allowance = await createSupabaseAssistantUsageRepository(client).recordMessage(
      ASSISTANT_MESSAGES_PER_HOUR,
    );
    if (!allowance.allowed) return json(429, { error: "rate_limited", retryAt: allowance.retryAt });
  } catch (error) {
    logger.error("Could not check assistant usage", error, { userId: user.id });
    return json(500, { error: "unavailable" });
  }

  const now = new Date();
  const context = {
    source: createSupabaseReadinessDataSource(client),
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
          createRunner: runnerFactory(apiKey),
          tools: createAssistantTools(context),
          history: body.messages,
          today: context.today,
          asOf: context.asOf,
          onText: (text) => send({ type: "text", text }),
        });
        send({ type: "done", status });
      } catch (error) {
        logger.error("Assistant request failed", error, { userId: user.id });
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
