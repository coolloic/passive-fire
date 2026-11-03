"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { clearPrivateData } from "@/lib/privacy/clear-private-data";

export interface DemoSignInState {
  message: string | null;
}

type DemoRole = "team_leader" | "project_manager";

interface DemoSignInProps {
  /**
   * Signs in as the persona for `role`. On success it redirects, so the promise resolves with no
   * state (or a state without a message); on failure it resolves with a message.
   */
  action: (role: DemoRole) => Promise<DemoSignInState | undefined>;
  /** Injected for tests. */
  clearDeviceData?: () => Promise<void>;
}

const PERSONA_LABEL: Record<DemoRole, string> = {
  team_leader: "Team Leader (SAMPLE)",
  project_manager: "Project Manager (SAMPLE)",
};

const UNAVAILABLE = "Sign-in is unavailable right now. Please try again.";

/**
 * Lets reviewers try the app as one of the two SAMPLE demo personas.
 * Optimistic: once a persona is chosen the UI stays in "signing in" until the redirect lands,
 * and only rolls back when the server reports a failure.
 */
export function DemoSignIn({ action, clearDeviceData = clearPrivateData }: DemoSignInProps) {
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(role: DemoRole) {
    setPendingRole(role);
    setMessage(null);
    try {
      // A new person may be using this device: drop anything saved for the previous one.
      await clearDeviceData();
      const failure = (await action(role))?.message ?? null;
      if (failure) rollBack(failure);
      // No message means the server is redirecting: keep the optimistic state until it lands.
    } catch {
      rollBack(UNAVAILABLE);
    }
  }

  function rollBack(failure: string) {
    setPendingRole(null);
    setMessage(failure);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <PersonaButton role="team_leader" pendingRole={pendingRole} onChoose={choose} />
        <PersonaButton
          role="project_manager"
          variant="secondary"
          pendingRole={pendingRole}
          onChoose={choose}
        />
      </div>
      <p aria-live="polite" className="text-base text-neutral-600 dark:text-neutral-400">
        {pendingRole ? `Signing in as ${PERSONA_LABEL[pendingRole]}…` : ""}
      </p>
      {message ? (
        <p role="alert" className="text-base text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface PersonaButtonProps {
  role: DemoRole;
  pendingRole: DemoRole | null;
  onChoose: (role: DemoRole) => void;
  variant?: "primary" | "secondary";
}

function PersonaButton({ role, pendingRole, onChoose, variant = "primary" }: PersonaButtonProps) {
  const busy = pendingRole === role;
  return (
    <Button
      variant={variant}
      fullWidth
      disabled={pendingRole !== null}
      aria-busy={busy || undefined}
      onClick={() => onChoose(role)}
      className="gap-2"
    >
      {busy ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      Continue as {PERSONA_LABEL[role]}
    </Button>
  );
}
