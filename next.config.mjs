import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Precache the offline fallback so it is available on the first offline navigation.
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  // Avoid stale caches while developing; test PWA behaviour with `pnpm build && pnpm start`.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
