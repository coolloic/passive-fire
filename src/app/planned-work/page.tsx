import type { Metadata } from "next";
import { DataFreshness } from "@/components/molecules/DataFreshness";
import { OutboxPanel } from "@/components/organisms/OutboxPanel";
import { SaveForOffline } from "@/components/organisms/SaveForOffline";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { PlannedWorkList } from "@/components/organisms/PlannedWorkList";
import { TeamLeaderNav } from "@/components/organisms/TeamLeaderNav";
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
import { raiseEscalationAction } from "../escalations/actions";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Planned work — QAntum Team Leader" };

export default async function PlannedWorkPage() {
  const user = await requireRole("team_leader");
  const today = todayIso();
  const asOf = new Date().toISOString();
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
      nav={<TeamLeaderNav />}
      actions={<SignOutButton action={signOut} />}
    >
      <p className="mb-4 text-base text-neutral-600 dark:text-neutral-400">
        Your crews&apos; planned work for the next 14 days. All data is SAMPLE data.
      </p>
      {summaries ? (
        <>
          <DataFreshness asOf={asOf} />
          <OutboxPanel userId={user.id} send={raiseEscalationAction} />
          <PlannedWorkList summaries={summaries} today={today} />
          <SaveForOffline
            hrefs={summaries.map((summary) => `/planned-work/${summary.plannedWorkId}`)}
            alsoSave={["/planned-work"]}
          />
        </>
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
