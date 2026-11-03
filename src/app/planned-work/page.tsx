import type { Metadata } from "next";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Planned work — QAntum Team Leader" };

export default async function PlannedWorkPage() {
  const user = await requireRole("team_leader");
  return (
    <AppShell
      title="Planned work"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <p className="text-base">
        Your crews&apos; planned work for the next 14 days will appear here.
      </p>
    </AppShell>
  );
}
