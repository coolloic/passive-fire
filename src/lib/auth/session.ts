import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { HOME_PATH, isUserRole, type UserRole } from "./roles";

export interface CurrentUser {
  id: string;
  displayName: string;
  role: UserRole;
}

/** The signed-in user and their role, or null. Verified with the auth server, not just the cookie. */
export async function getCurrentUser(
  client: SupabaseClient = createServerSupabaseClient(),
): Promise<CurrentUser | null> {
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    const profile = await client
      .from("profiles")
      .select("display_name, role")
      .eq("id", data.user.id)
      .single();
    if (profile.error || !profile.data || !isUserRole(profile.data.role)) return null;
    return { id: data.user.id, displayName: profile.data.display_name, role: profile.data.role };
  } catch (error) {
    logger.error("Could not load the current user", error);
    return null;
  }
}

/**
 * Returns the signed-in user if they have `role`. Otherwise redirects on the server: to sign-in
 * when signed out, or to their own home when they have the other role (spec AC-1.2, AC-1.3).
 */
export async function requireRole(
  role: UserRole,
  client: SupabaseClient = createServerSupabaseClient(),
): Promise<CurrentUser> {
  const user = await getCurrentUser(client);
  if (!user) redirect("/sign-in");
  if (user.role !== role) redirect(HOME_PATH[user.role]);
  return user;
}
