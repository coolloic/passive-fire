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

/** Number of escalations stored for a planned work. */
export async function countEscalations(plannedWorkId: string): Promise<number> {
  const { count, error } = await adminClient()
    .from("escalations")
    .select("id", { count: "exact", head: true })
    .eq("planned_work_id", plannedWorkId);
  if (error) throw error;
  return count ?? 0;
}

/** Creates an Open escalation behind the app's back, to simulate a clash. Returns its id. */
export async function createOpenEscalation(
  plannedWorkId: string,
  raisedBy: string,
): Promise<string> {
  const { data, error } = await adminClient()
    .from("escalations")
    .insert({ planned_work_id: plannedWorkId, raised_by: raisedBy })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}
