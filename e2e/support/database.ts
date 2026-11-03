import { createClient } from "@supabase/supabase-js";

/**
 * Service role client for E2E TEST SETUP ONLY (resetting state between tests). It bypasses RLS,
 * so it must never be used to assert behaviour. The app itself never uses this key this way.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "E2E database helpers need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Removes every escalation so each test starts from the SAMPLE seed. */
export async function resetEscalations(): Promise<void> {
  const { error } = await adminClient().from("escalations").delete().not("id", "is", null);
  if (error) throw error;
}
