"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface NeedsConnectionProps {
  /** What the disabled control says while offline. */
  label: string;
  /** Why it is unavailable, shown under it. */
  reason: string;
  children: ReactNode;
}

/** Shows `children` online; offline, a disabled control with the reason (spec AC-9.4). */
export function NeedsConnection({ label, reason, children }: NeedsConnectionProps) {
  const online = useOnlineStatus();
  if (online) return <>{children}</>;
  return (
    <div className="flex flex-col gap-1">
      <Button disabled aria-describedby="needs-connection-reason">
        {label}
      </Button>
      <p id="needs-connection-reason" className="text-sm text-neutral-600 dark:text-neutral-400">
        {reason}
      </p>
    </div>
  );
}
