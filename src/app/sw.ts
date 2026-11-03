import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";
import {
  LEGACY_PAGE_CACHES,
  OFFLINE_PAGES_CACHE,
  OFFLINE_PREFETCH_HEADER,
  decidePageCaching,
} from "../lib/offline/routes";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const decide = (request: Request, url: URL, sameOrigin: boolean) =>
  decidePageCaching({
    method: request.method,
    mode: request.mode,
    sameOrigin,
    pathname: url.pathname,
    isRscRequest: request.headers.get("RSC") === "1",
    isOfflinePrefetch: request.headers.get(OFFLINE_PREFETCH_HEADER) === "1",
  });

/** Never store errors or redirects (e.g. to /sign-in after a session expires) as planned work. */
const onlyGenuinePages: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => (response.ok && !response.redirected ? response : null),
};

// ADR 0003: only the team leader's Planned Work pages are kept for offline use; every other
// private page is network-only. These rules run before Serwist's defaults, whose catch-all
// would otherwise cache any same-origin page.
const pageRules: RuntimeCaching[] = [
  {
    matcher: ({ request, url, sameOrigin }) => decide(request, url, sameOrigin) === "offline-cache",
    handler: new NetworkFirst({
      cacheName: OFFLINE_PAGES_CACHE,
      networkTimeoutSeconds: 5,
      plugins: [
        onlyGenuinePages,
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      ],
    }),
  },
  {
    matcher: ({ request, url, sameOrigin }) => decide(request, url, sameOrigin) === "network-only",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...pageRules, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Remove private pages that earlier service worker versions may have cached.
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(LEGACY_PAGE_CACHES.map((name) => caches.delete(name))));
});

serwist.addEventListeners();
