import "server-only";
import { z } from "zod";
import { EnvValidationError } from "./env";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type RawEnv = Record<string, string | undefined>;

/** Validates server-only secrets. Error messages name the variables, never their values. */
export function parseServerEnv(
  raw: RawEnv = { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY },
): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError([
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  }
  return result.data;
}

/** The Anthropic API key, or null when the assistant is not configured on this server. */
export function getAnthropicApiKey(
  raw: string | undefined = process.env.ANTHROPIC_API_KEY,
): string | null {
  const key = raw?.trim();
  return key ? key : null;
}

/** The assistant is on unless AI_ENABLED is explicitly "false" (or "0"/"off"). */
export function isAssistantEnabled(raw: string | undefined = process.env.AI_ENABLED): boolean {
  return !["false", "0", "off"].includes((raw ?? "").trim().toLowerCase());
}
