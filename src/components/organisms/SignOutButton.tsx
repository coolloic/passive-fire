"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { clearPrivateCaches } from "@/lib/offline/cache";

interface SignOutButtonProps {
  action: () => Promise<void>;
  /** Injected for tests. */
  clearCaches?: () => Promise<void>;
}

/** Signs out after removing pages saved for offline use from this device (ADR 0003). */
export function SignOutButton({ action, clearCaches = clearPrivateCaches }: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await clearCaches();
    await action();
  }

  return (
    <Button variant="secondary" disabled={pending} onClick={signOut}>
      Sign out
    </Button>
  );
}
