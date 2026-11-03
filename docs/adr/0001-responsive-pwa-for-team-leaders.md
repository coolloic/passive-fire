# Responsive installable web app for team leaders, not Flutter

Team leaders get a single responsive, installable Next.js web app for both phone and desktop, rather than new screens in QAntum's Flutter operative app. Team leaders are a new persona whose work spans the office and the site. One web codebase on the existing React/Next.js/Supabase/Vercel stack ships faster, deploys continuously and can be reviewed at a public URL. A service worker covers the offline needs of this slice: reading the last-synced readiness view and queuing escalations.

## Considered Options

- **Screens in the Flutter app**: reuses the offline-first mobile app, but couples team-leader features to operative app releases and app-store distribution, and gives no desktop experience.
- **Separate native app**: highest offline fidelity, but disproportionate for a first slice.

## Consequences

- Offline capability is limited to what browsers support (service worker caches, IndexedDB, Background Sync where available). Heavier offline needs in later iterations may justify revisiting this decision.
- Team leaders who also operate on site use two apps until the experiences converge.
