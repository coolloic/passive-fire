"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextLink } from "@/components/atoms/TextLink";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  outbox as defaultOutbox,
  OUTBOX_CHANGED_EVENT,
  type Outbox,
  type OutboxItem,
} from "@/lib/offline/outbox";
import { rememberSent, recentlySent } from "@/lib/offline/sent-notice";
import { syncOutbox, type Send } from "@/lib/offline/sync";

interface OutboxPanelProps {
  userId: string;
  send: Send;
  /** Injected for tests. */
  store?: Outbox;
}

/**
 * Escalations waiting on this device. Sends them automatically when the page opens online and
 * whenever the connection returns, with a manual Retry (spec AC-10.1, AC-10.2, AC-10.5).
 */
export function OutboxPanel({ userId, send, store = defaultOutbox }: OutboxPanelProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const running = useRef(false);
  const sentTotal = useRef(0);
  // Keep the router in a ref so `sync` does not change identity on every render.
  const routerRef = useRef(router);
  routerRef.current = router;

  const load = useCallback(async () => {
    try {
      setItems(await store.list(userId));
    } catch {
      // No IndexedDB (e.g. some private browsing modes): nothing can be waiting.
      setItems([]);
    }
  }, [store, userId]);

  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setSyncing(true);
    try {
      const result = await syncOutbox(store, userId, send);
      if (result.sent > 0) {
        sentTotal.current += result.sent;
        setSentCount(sentTotal.current);
        // If the refresh below falls back to a full reload, the new page shows this count.
        rememberSent(userId, sentTotal.current);
        routerRef.current.refresh();
      }
    } finally {
      running.current = false;
      setSyncing(false);
      await load();
    }
  }, [store, userId, send, load]);

  useEffect(() => {
    // Idempotent (the count is kept until it expires), so a repeated effect cannot double it.
    const restored = recentlySent(userId);
    if (restored > sentTotal.current) {
      sentTotal.current = restored;
      setSentCount(restored);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(OUTBOX_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(OUTBOX_CHANGED_EVENT, onChange);
  }, [load]);

  useEffect(() => {
    if (online) void sync();
  }, [online, sync]);

  const pending = items.filter((item) => item.status !== "already_open");
  const notices = items.filter((item) => item.status === "already_open");
  if (pending.length === 0 && notices.length === 0 && sentCount === 0) return null;

  return (
    <section
      aria-labelledby="outbox-heading"
      className="mb-4 flex max-w-3xl flex-col gap-3 rounded-lg border border-amber-600 p-4"
    >
      <h2 id="outbox-heading" className="text-lg font-semibold">
        Waiting to send
      </h2>
      {sentCount > 0 ? (
        <p role="status" className="text-base">
          Sent {sentCount} {sentCount === 1 ? "escalation" : "escalations"} saved on this device.
        </p>
      ) : null}
      {pending.length > 0 ? (
        <>
          <ul className="flex flex-col gap-2">
            {pending.map((item) => (
              <li key={item.id} className="text-base">
                <span className="font-medium">{item.label}</span> —{" "}
                {item.status === "failed" ? item.message : "Waiting to send"}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1">
            <Button variant="secondary" disabled={!online || syncing} onClick={() => void sync()}>
              {syncing ? "Sending…" : "Retry now"}
            </Button>
            {!online ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                They will be sent when you&apos;re back online.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
      {notices.map((item) => (
        <div key={item.id} role="alert" className="flex flex-col gap-1 text-base">
          <p>
            <span className="font-medium">{item.label}</span> — {item.message}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {item.existingEscalationId ? (
              <TextLink href={`/escalations/${item.existingEscalationId}`}>
                View open escalation
              </TextLink>
            ) : null}
            <Button variant="secondary" onClick={() => void store.remove(item.id)}>
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
