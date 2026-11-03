import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { DemoAuthGateway } from "./demo-sign-in";

/**
 * Passwordless demo sign-in. The admin client only issues a one-time magic-link token for a
 * SAMPLE persona; the session is then created by the user-scoped client, so RLS applies.
 */
export function createSupabaseDemoGateway(
  admin: SupabaseClient = createAdminSupabaseClient(),
  client: SupabaseClient = createServerSupabaseClient(),
): DemoAuthGateway {
  return {
    async issueSignInToken(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error) throw error;
      return data.properties.hashed_token;
    },
    async redeemSignInToken(tokenHash) {
      const { error } = await client.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (error) throw error;
    },
  };
}
