import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePublicEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/** Singleton Supabase client for Client Components. Uses the anon key; data access relies on RLS. */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (!client) {
    const env = parsePublicEnv();
    client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
