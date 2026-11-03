import type { Metadata } from "next";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import { signOut } from "../sign-in/actions";

export const metadata: Metadata = { title: "Escalation inbox — QAntum Team Leader" };

export default async function InboxPage() {
  const user = await requireRole("project_manager");
  return (
    <AppShell
      title="Escalation inbox"
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <p className="text-base">Escalations from team leaders will appear here.</p>
    </AppShell>
  );
}
