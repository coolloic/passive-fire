import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAssistantUsageRepository } from "@/lib/data/assistant-usage-repository";
import { getAnthropicApiKey, isAssistantEnabled } from "@/lib/env.server";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

/** Spec AC-13.1: shared by chat and drafting. */
export const ASSISTANT_MESSAGES_PER_HOUR = 20;

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export interface AssistantAccess {
  user: CurrentUser;
  apiKey: string;
  client: SupabaseClient;
}

/** Checks everything that must pass before the model is called. Returns a response on refusal. */
export async function checkAssistantAccess(): Promise<
  { denied: Response } | { access: AssistantAccess }
> {
  const user = await getCurrentUser();
  if (!user) return { denied: jsonResponse(401, { error: "not_signed_in" }) };
  if (user.role !== "team_leader") return { denied: jsonResponse(403, { error: "forbidden" }) };
  if (!isAssistantEnabled()) return { denied: jsonResponse(503, { error: "disabled" }) };
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return { denied: jsonResponse(503, { error: "not_configured" }) };
  return { access: { user, apiKey, client: createServerSupabaseClient() } };
}

/** Counts one message against the hourly limit. Call only after validating the request. */
export async function checkAssistantAllowance(access: AssistantAccess): Promise<Response | null> {
  try {
    const allowance = await createSupabaseAssistantUsageRepository(access.client).recordMessage(
      ASSISTANT_MESSAGES_PER_HOUR,
    );
    return allowance.allowed
      ? null
      : jsonResponse(429, { error: "rate_limited", retryAt: allowance.retryAt });
  } catch (error) {
    logger.error("Could not check assistant usage", error, { userId: access.user.id });
    return jsonResponse(500, { error: "unavailable" });
  }
}
