"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";

/** Banner shown while the device is offline. Renders nothing when online. */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-base font-medium text-black"
    >
      You are offline. Showing saved data; changes will sync when you reconnect.
    </div>
  );
}
