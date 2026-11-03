import type { Metadata } from "next";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { PlannedWorkList } from "@/components/organisms/PlannedWorkList";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import {
  getPlannedWorkSummaries,
  type PlannedWorkSummary,
} from "@/lib/services/planned-work-summaries";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Planned work — QAntum Team Leader" };

export default async function PlannedWorkPage() {
  const user = await requireRole("team_leader");
  const today = todayIso();
  let summaries: PlannedWorkSummary[] | null = null;
  try {
    summaries = await getPlannedWorkSummaries(
      createSupabaseReadinessDataSource(createServerSupabaseClient()),
      today,
    );
  } catch (error) {
    logger.error("Could not load planned work", error, { userId: user.id });
  }

  return (
    <AppShell
      title="Planned work"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <p className="mb-4 text-base text-neutral-600 dark:text-neutral-400">
        Your crews&apos; planned work for the next 14 days. All data is SAMPLE data.
      </p>
      {summaries ? (
        <PlannedWorkList summaries={summaries} today={today} />
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
        >
          We couldn&apos;t load your planned work. Refresh the page to try again.
        </p>
      )}
    </AppShell>
  );
}
