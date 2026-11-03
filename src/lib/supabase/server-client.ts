import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { parsePublicEnv } from "@/lib/env";

/**
 * Per-request Supabase client for Server Components, Route Handlers and Server Actions.
 * Acts as the signed-in user (anon key + auth cookie), so RLS policies apply.
 */
export function createServerSupabaseClient(): SupabaseClient {
  const env = parsePublicEnv();
  const cookieStore = cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. Session refresh happens
          // in middleware once auth is added.
        }
      },
    },
  });
}
