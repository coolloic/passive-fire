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
import { TextLink } from "@/components/atoms/TextLink";

export const metadata: Metadata = { title: "My escalations — QAntum Team Leader" };

export default async function MyEscalationsPage() {
  const user = await requireRole("team_leader");
  let escalations: EscalationSummary[] | null = null;
  try {
    escalations = await createSupabaseEscalationRepository(createServerSupabaseClient()).listMine();
  } catch (error) {
    logger.error("Could not load escalations", error, { userId: user.id });
  }
  return (
    <AppShell
      title="My escalations"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <TextLink href="/planned-work" className="mb-4">
        ← Back to planned work
      </TextLink>
      {escalations ? (
        <EscalationList
          escalations={escalations}
          hrefFor={(id) => `/escalations/${id}`}
          emptyMessage="You haven't raised any escalations."
        />
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
        >
          We couldn&apos;t load your escalations. Refresh the page to try again.
        </p>
      )}
    </AppShell>
  );
}
