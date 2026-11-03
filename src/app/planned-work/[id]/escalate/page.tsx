import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/atoms/ButtonLink";
import { EscalationForm } from "@/components/organisms/EscalationForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { formatWorkDate, todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { NOTE_MAX_LENGTH } from "@/lib/services/escalations";
import { getPlannedWorkDetail, type PlannedWorkDetail } from "@/lib/services/planned-work-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { raiseEscalationAction } from "../../../escalations/actions";
import { signOut } from "../../../sign-in/actions";
import { TextLink } from "@/components/atoms/TextLink";

export const metadata: Metadata = { title: "Escalate — QAntum Team Leader" };

interface EscalatePageProps {
  params: { id: string };
}

export default async function EscalatePage({ params }: EscalatePageProps) {
  const user = await requireRole("team_leader");
  let detail: PlannedWorkDetail | null = null;
  let failed = false;
  try {
    detail = await getPlannedWorkDetail(
      createSupabaseReadinessDataSource(createServerSupabaseClient()),
      params.id,
      todayIso(),
    );
  } catch (error) {
    failed = true;
    logger.error("Could not load planned work for escalation", error, { userId: user.id });
  }
  if (!failed && !detail) notFound();

  return (
    <AppShell
      title="Escalate a shortage"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <TextLink href={`/planned-work/${params.id}`} className="mb-4">
        ← Back to the planned work
      </TextLink>
      <div className="flex max-w-3xl flex-col gap-4">
        {detail ? (
          <>
            <p className="text-base">
              {formatWorkDate(detail.workDate)} · {detail.crewName} · {detail.siteName}. The project
              manager will see the items below and your note.
            </p>
            {detail.escalation.kind === "view" ? (
              <div className="flex flex-col gap-3">
                <p className="text-base">An escalation is already open for this planned work.</p>
                <ButtonLink
                  href={`/escalations/${detail.escalation.escalationId}`}
                  variant="secondary"
                >
                  View open escalation
                </ButtonLink>
              </div>
            ) : detail.escalation.kind === "none" ? (
              <p className="text-base">
                This planned work is Ready, so there is nothing to escalate.
              </p>
            ) : (
              <EscalationForm
                plannedWorkId={detail.plannedWorkId}
                lines={detail.escalationLines.map((line) => line.description)}
                maxNoteLength={NOTE_MAX_LENGTH}
                action={raiseEscalationAction}
                allowDraft
              />
            )}
          </>
        ) : (
          <p
            role="alert"
            className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
          >
            We couldn&apos;t load this planned work. Refresh the page to try again.
          </p>
        )}
      </div>
    </AppShell>
  );
}
