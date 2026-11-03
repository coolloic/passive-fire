import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Test helpers (e.g. resetting escalations) read the local Supabase settings; CI sets them itself.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Tests share one local database (escalations, sessions), so run them one at a time.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // E2E runs against a production build (`pnpm test:e2e` builds first), never the dev server.
  // Start Next directly so Playwright can stop the server process on teardown.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
