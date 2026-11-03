import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EscalationDetailView } from "@/components/organisms/EscalationDetailView";
import { NoteForm } from "@/components/organisms/NoteForm";
import { ResolveForm } from "@/components/organisms/ResolveForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import {
  createSupabaseEscalationRepository,
  type EscalationRecord,
  type EscalationResolution,
} from "@/lib/data/escalation-repository";
import { RESOLUTION_LABELS } from "@/lib/escalation/labels";
import { logger } from "@/lib/logger";
import { NOTE_MAX_LENGTH } from "@/lib/services/escalations";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { addNoteAction, resolveEscalationAction } from "../../escalations/actions";
import { signOut } from "../../sign-in/actions";

export const metadata: Metadata = { title: "Escalation — QAntum Team Leader" };

const RESOLUTION_OPTIONS = (Object.keys(RESOLUTION_LABELS) as EscalationResolution[]).map(
  (value) => ({
    value,
    label: RESOLUTION_LABELS[value],
  }),
);

interface InboxEscalationPageProps {
  params: { id: string };
}

export default async function InboxEscalationPage({ params }: InboxEscalationPageProps) {
  const user = await requireRole("project_manager");
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
      <Link href="/inbox" className="mb-4 inline-flex min-h-11 items-center text-base underline">
        ← Escalation inbox
      </Link>
      {escalation ? (
        <EscalationDetailView
          escalation={escalation}
          actions={
            escalation.state === "open" ? (
              <section
                aria-labelledby="resolve-heading"
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
              >
                <h2 id="resolve-heading" className="text-lg font-semibold">
                  Resolve
                </h2>
                <ResolveForm
                  escalationId={escalation.id}
                  options={RESOLUTION_OPTIONS}
                  maxCommentLength={NOTE_MAX_LENGTH}
                  action={resolveEscalationAction}
                />
              </section>
            ) : null
          }
          noteForm={
            escalation.state === "open" ? (
              <NoteForm
                escalationId={escalation.id}
                maxLength={NOTE_MAX_LENGTH}
                action={addNoteAction}
              />
            ) : null
          }
        />
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
