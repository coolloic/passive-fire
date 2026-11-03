import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

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
};

export default withSerwist(nextConfig);
