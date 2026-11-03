import type { Metadata } from "next";
import { EscalationList } from "@/components/organisms/EscalationList";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import {
  createSupabaseEscalationRepository,
  type EscalationSummary,
} from "@/lib/data/escalation-repository";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Escalation inbox — QAntum Team Leader" };

export default async function InboxPage() {
  const user = await requireRole("project_manager");
  let escalations: EscalationSummary[] | null = null;
  try {
    escalations = await createSupabaseEscalationRepository(
      createServerSupabaseClient(),
    ).listForInbox();
  } catch (error) {
    logger.error("Could not load the escalation inbox", error, { userId: user.id });
  }
  return (
    <AppShell
      title="Escalation inbox"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <p className="mb-4 text-base text-neutral-600 dark:text-neutral-400">
        Open escalations first, oldest first. All data is SAMPLE data.
      </p>
      {escalations ? (
        <EscalationList
          escalations={escalations}
          hrefFor={(id) => `/inbox/${id}`}
          emptyMessage="No escalations yet."
        />
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
        >
          We couldn&apos;t load the inbox. Refresh the page to try again.
        </p>
      )}
    </AppShell>
  );
}
