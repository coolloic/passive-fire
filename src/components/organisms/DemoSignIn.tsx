"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { clearPrivateData } from "@/lib/privacy/clear-private-data";

export interface DemoSignInState {
  message: string | null;
}

type DemoRole = "team_leader" | "project_manager";

interface DemoSignInProps {
  /** Signs in as the persona for `role`. Redirects on success; resolves with a message on failure. */
  action: (role: DemoRole) => Promise<DemoSignInState>;
  /** Injected for tests. */
  clearDeviceData?: () => Promise<void>;
}

/** Lets reviewers try the app as one of the two SAMPLE demo personas. */
export function DemoSignIn({ action, clearDeviceData = clearPrivateData }: DemoSignInProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(role: DemoRole) {
    setPending(true);
    setMessage(null);
    try {
      // A new person may be using this device: drop anything saved for the previous one.
      await clearDeviceData();
      const result = await action(role);
      setMessage(result.message);
    } catch {
      setMessage("Sign-in is unavailable right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button fullWidth disabled={pending} onClick={() => choose("team_leader")}>
          Continue as Team Leader (SAMPLE)
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={pending}
          onClick={() => choose("project_manager")}
        >
          Continue as Project Manager (SAMPLE)
        </Button>
      </div>
      <p aria-live="polite" className="text-base text-neutral-600 dark:text-neutral-400">
        {pending ? "Signing in…" : ""}
      </p>
      {message ? (
        <p role="alert" className="text-base text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
