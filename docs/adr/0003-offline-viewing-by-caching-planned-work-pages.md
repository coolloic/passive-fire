# Offline viewing by caching the Planned Work pages

Team leaders need their planned work readable offline (spec FR-9). The service worker keeps network-first copies of the Planned Work list and detail pages, and the list pre-loads the next 14 days' detail pages so they open offline even if never visited. Pages show the time they were generated ("Data as of") and warn after 24 hours. This was chosen over an IndexedDB snapshot because it reuses the existing server-rendered pages: no second, browser-only rendering path to build, test and keep in step. The product owner explicitly approved caching these authenticated pages (`CLAUDE.md` §6 requires that approval).

## Safeguards

- Only `/planned-work` and `/planned-work/[id]` are cached, in a dedicated cache. Every other private page (the escalate form, escalations, the project manager inbox) and all Next.js data (RSC) requests are network-only.
- Errors and redirects (for example to `/sign-in` after a session expires) are never stored as planned work.
- Signing in and signing out delete the cache, and so does activating a new service worker for caches older versions may have filled.
- Offline, links to cached pages become plain links so the browser requests the saved document; actions that need the network are disabled with the reason shown.

## Considered Options

- **IndexedDB snapshot rendered in the browser** (the original design): more reusable data offline and storage outside the HTTP cache, but a second rendering path for two screens and more client-side JavaScript. Kept as a possible enhancement.
- **Serwist's default rules unchanged**: these cached every same-origin page, including other personas' private pages, for 24 hours without clearing on sign-out. Rejected.

## Consequences

- Offline data is a snapshot of whole pages: it cannot be queried, and it refreshes only when pages are visited online.
- The outbox for escalations raised offline (task 6.2) still needs IndexedDB.
