import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Integration tests run against the local Supabase stack (`pnpm db:start`).
// Connection settings come from `.env.local` locally and from the CI environment.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    testTimeout: 15_000,
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
