import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EscalationStateBadge } from "@/components/atoms/EscalationStateBadge";
import { EscalationLineList } from "@/components/molecules/EscalationLineList";
import { NoteList } from "@/components/molecules/NoteList";
import { NoteForm } from "@/components/organisms/NoteForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import {
  createSupabaseEscalationRepository,
  type EscalationRecord,
} from "@/lib/data/escalation-repository";
import { RESOLUTION_LABELS, describeStoredLine } from "@/lib/escalation/labels";
import { formatDateTime, formatWorkDate } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { NOTE_MAX_LENGTH } from "@/lib/services/escalations";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { signOut } from "../../sign-in/actions";
import { addNoteAction } from "../actions";

export const metadata: Metadata = { title: "Escalation — QAntum Team Leader" };

interface EscalationPageProps {
  params: { id: string };
}

export default async function EscalationPage({ params }: EscalationPageProps) {
  const user = await requireRole("team_leader");
  let escalation: EscalationRecord | null = null;
  let failed = false;
  try {
    escalation = await createSupabaseEscalationRepository(createServerSupabaseClient()).get(
      params.id,
    );
  } catch (error) {
    failed = true;
    logger.error("Could not load escalation", error, { userId: user.id });
  }
  if (!failed && !escalation) notFound();

  return (
    <AppShell
      title="Escalation"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <Link
        href="/escalations"
        className="mb-4 inline-flex min-h-11 items-center text-base underline"
      >
        ← My escalations
      </Link>
      {escalation ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <section
            aria-label="Summary"
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium">
                {formatWorkDate(escalation.workDate)} · {escalation.crewName}
              </p>
              <EscalationStateBadge state={escalation.state} />
            </div>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              {escalation.siteName} · raised {formatDateTime(escalation.raisedAt)}
            </p>
            {escalation.shortageClearedAtSync ? (
              <p className="text-base">
                The shortage was no longer present when this escalation was sent.
              </p>
            ) : null}
            {escalation.resolution ? (
              <p className="text-base">
                <span className="font-medium">Resolution:</span>{" "}
                {RESOLUTION_LABELS[escalation.resolution]}
                {escalation.resolutionComment ? ` — ${escalation.resolutionComment}` : ""}
              </p>
            ) : null}
            <Link
              href={`/planned-work/${escalation.plannedWorkId}`}
              className="inline-flex min-h-11 items-center text-base underline"
            >
              View the planned work
            </Link>
          </section>
          <section aria-labelledby="lines-heading" className="flex flex-col gap-2">
            <h2 id="lines-heading" className="text-lg font-semibold">
              What was escalated
            </h2>
            <EscalationLineList lines={escalation.lines.map(describeStoredLine)} />
          </section>
          <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
            <h2 id="notes-heading" className="text-lg font-semibold">
              Notes
            </h2>
            <NoteList notes={escalation.notes} formatTime={formatDateTime} />
            {escalation.state === "open" ? (
              <NoteForm
                escalationId={escalation.id}
                maxLength={NOTE_MAX_LENGTH}
                action={addNoteAction}
              />
            ) : null}
          </section>
        </div>
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
        >
          We couldn&apos;t load this escalation. Refresh the page to try again.
        </p>
      )}
    </AppShell>
  );
}
