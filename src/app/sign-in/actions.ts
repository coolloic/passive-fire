"use server";

import { redirect } from "next/navigation";
import type { DemoSignInState } from "@/components/organisms/DemoSignIn";
import { signInAsDemoPersona } from "@/lib/auth/demo-sign-in";
import { createSupabaseDemoGateway } from "@/lib/auth/supabase-demo-gateway";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export async function signInAsDemo(role: unknown): Promise<DemoSignInState> {
  let result;
  try {
    result = await signInAsDemoPersona(role, createSupabaseDemoGateway());
  } catch (error) {
    logger.error("Demo sign-in failed", error);
    return { message: "Sign-in is unavailable right now. Please try again." };
  }
  if (!result.ok) return { message: result.message };
  redirect(result.redirectTo);
}

export async function signOut(): Promise<void> {
  try {
    await createServerSupabaseClient().auth.signOut();
  } catch (error) {
    logger.error("Sign-out failed", error);
  }
  redirect("/sign-in");
}
