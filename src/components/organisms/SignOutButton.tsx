"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { clearPrivateData } from "@/lib/privacy/clear-private-data";

interface SignOutButtonProps {
  action: () => Promise<void>;
  /** Injected for tests. */
  clearDeviceData?: () => Promise<void>;
}

/** Signs out after removing private data from this device: saved pages and the assistant conversation. */
export function SignOutButton({ action, clearDeviceData = clearPrivateData }: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await clearDeviceData();
    await action();
  }

  return (
    <Button variant="secondary" disabled={pending} onClick={signOut}>
      Sign out
    </Button>
  );
}
