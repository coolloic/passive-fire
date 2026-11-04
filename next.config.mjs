import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import { securityHeaderRoutes } from "./src/lib/security/headers.mjs";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Precache the offline fallback so it is available on the first offline navigation, and the
  // manifest (a generated route, so not in the build's precache list), which the browser
  // requests on every page load.
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/manifest.webmanifest", revision },
  ],
  // Avoid stale caches while developing; test PWA behaviour with `pnpm build && pnpm start`.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  headers: securityHeaderRoutes,
  experimental: {
    // Readiness and escalation pages change on other people's devices (a project manager
    // resolving, another crew taking stock). Next 14 reuses a visited dynamic page on in-app
    // navigation for 30 s by default, which showed a resolved escalation as Open (AC-8.4).
    // Always fetch the current page instead. Offline viewing uses the service worker, not this.
    staleTimes: { dynamic: 0 },
  },
};

export default withSerwist(nextConfig);
