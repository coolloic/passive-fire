"use client";

import { useEffect, useState } from "react";
import { OFFLINE_PREFETCH_HEADER } from "@/lib/offline/routes";

interface SaveForOfflineProps {
  /** Detail pages to keep for offline use; these are counted in the message. */
  hrefs: readonly string[];
  /** Other pages to keep (e.g. the list itself, which is often reached by a client-side transition). */
  alsoSave?: readonly string[];
  /** Injected for tests. */
  fetcher?: typeof fetch;
  hasServiceWorker?: () => boolean;
}

const defaultHasServiceWorker = () =>
  Boolean(navigator.serviceWorker?.controller) && navigator.onLine;

/**
 * Pre-loads the listed detail pages through the service worker so they open offline even if the
 * team leader never visited them (ADR 0003). Does nothing without an active service worker.
 */
export function SaveForOffline({
  hrefs,
  alsoSave = [],
  fetcher = fetch,
  hasServiceWorker = defaultHasServiceWorker,
}: SaveForOfflineProps) {
  const [saved, setSaved] = useState<number | null>(null);
  const key = [...hrefs, "", ...alsoSave].join("|");

  useEffect(() => {
    if (hrefs.length === 0 || !hasServiceWorker()) return;
    let cancelled = false;
    const save = (href: string) =>
      fetcher(href, { credentials: "same-origin", headers: { [OFFLINE_PREFETCH_HEADER]: "1" } })
        .then((response) => response.ok)
        .catch(() => false);
    alsoSave.forEach((href) => void save(href));
    Promise.all(hrefs.map(save))
      // Each fetch already turns failures into `false`, so this never rejects.
      .then((results) => {
        if (!cancelled) setSaved(results.filter(Boolean).length);
      });
    return () => {
      cancelled = true;
    };
    // `key` captures the hrefs; the injected functions are stable for a given render tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <p aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
      {saved === null
        ? ""
        : `Saved ${saved} planned ${saved === 1 ? "work" : "works"} for offline use`}
    </p>
  );
}
