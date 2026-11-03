import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parsePublicEnv } from "@/lib/env";
import { parseServerEnv } from "@/lib/env.server";

/**
 * Service role client. It bypasses RLS, so it is used for ONE purpose only: issuing the
 * passwordless sign-in token for the SAMPLE demo personas (see src/lib/auth/demo-sign-in.ts).
 * Never use it to read or write application data.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL } = parsePublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = parseServerEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
