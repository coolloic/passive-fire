import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly variables: string[]) {
    super(`Missing or invalid environment variables: ${variables.join(", ")}`);
    this.name = "EnvValidationError";
  }
}

type RawEnv = Record<string, string | undefined>;

/**
 * Validates public (browser-safe) env vars. Error messages name the variables, never their values.
 * `NEXT_PUBLIC_*` vars must be referenced statically so Next.js can inline them in client bundles.
 */
export function parsePublicEnv(
  raw: RawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): PublicEnv {
  const result = publicEnvSchema.safeParse(raw);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new EnvValidationError(variables);
  }
  return result.data;
}
