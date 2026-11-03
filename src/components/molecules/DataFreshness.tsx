"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatDateTime } from "@/lib/format/date";

/** Readiness older than this is flagged as possibly out of date (spec AC-9.3). */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface DataFreshnessProps {
  /** When the data on this page was generated (ISO timestamp). */
  asOf: string;
  /** Injected for tests. */
  now?: () => number;
}

/**
 * "Data as of …", a clear notice when offline, and a warning once the data is more than 24 hours
 * old (spec AC-9.2, AC-9.3). Staleness is checked after mount so server and client HTML match.
 */
export function DataFreshness({ asOf, now = Date.now }: DataFreshnessProps) {
  const online = useOnlineStatus();
  const [stale, setStale] = useState(false);
  const label = formatDateTime(asOf);

  useEffect(() => {
    setStale(now() - new Date(asOf).getTime() > STALE_AFTER_MS);
  }, [asOf, now]);

  return (
    <div className="mb-4 flex flex-col gap-2">
      {online ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Data as of {label}</p>
      ) : (
        <p
          role="status"
          className="rounded-md border border-amber-600 bg-amber-50 p-3 text-base text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          You&apos;re offline. Showing saved data from {label}.
        </p>
      )}
      {stale ? (
        <p
          role="alert"
          className="rounded-md border border-red-700 p-3 text-base text-red-800 dark:text-red-200"
        >
          Readiness may be out of date. Reconnect before relying on it.
        </p>
      ) : null}
    </div>
  );
}
