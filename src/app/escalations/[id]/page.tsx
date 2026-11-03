import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EscalationDetailView } from "@/components/organisms/EscalationDetailView";
import { NoteForm } from "@/components/organisms/NoteForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import {
  createSupabaseEscalationRepository,
  type EscalationRecord,
} from "@/lib/data/escalation-repository";
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
        <EscalationDetailView
          escalation={escalation}
          plannedWorkHref={`/planned-work/${escalation.plannedWorkId}`}
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
