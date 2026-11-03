// Which requests the service worker may keep for offline use (ADR 0003).
// Only the team leader's Planned Work list and detail pages are cached; every other private
// page is network-only so it is never stored on the device.

/** Cache holding the team leader's Planned Work pages. Cleared on sign-in and sign-out. */
export const OFFLINE_PAGES_CACHE = "team-leader-offline-pages";

/** Caches that older service worker rules may have filled with private pages. */
export const LEGACY_PAGE_CACHES = ["pages", "pages-rsc", "pages-rsc-prefetch", "others"] as const;

/** Header the app sends when pre-loading planned work pages for offline use. */
export const OFFLINE_PREFETCH_HEADER = "X-Offline-Prefetch";

const PLANNED_WORK_PAGE =
  /^\/planned-work(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\/?$/i;
const PRIVATE_PREFIXES = ["/planned-work", "/escalations", "/inbox"];

/** The list and detail pages that may be shown offline (not the escalate form). */
export function isOfflinePlannedWorkPage(pathname: string): boolean {
  return PLANNED_WORK_PAGE.test(pathname);
}

/** Pages that hold personal data. */
export function isPrivatePage(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface CacheableRequest {
  method: string;
  mode: string;
  sameOrigin: boolean;
  pathname: string;
  isRscRequest: boolean;
  isOfflinePrefetch: boolean;
}

export type PageCacheDecision = "offline-cache" | "network-only" | "default";

/**
 * How the service worker should treat a request. Document requests and app pre-loads for the
 * Planned Work pages go to the offline cache; any other request for a private page, including
 * Next.js data (RSC) requests, is never cached; everything else uses the default rules.
 */
export function decidePageCaching(request: CacheableRequest): PageCacheDecision {
  if (!request.sameOrigin || request.method !== "GET") return "default";
  if (!isPrivatePage(request.pathname)) return "default";
  const isDocument = request.mode === "navigate" || request.isOfflinePrefetch;
  if (isDocument && !request.isRscRequest && isOfflinePlannedWorkPage(request.pathname))
    return "offline-cache";
  return "network-only";
}
