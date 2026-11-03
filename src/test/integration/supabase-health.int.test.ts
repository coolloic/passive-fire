import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "@/lib/env";

describe("local Supabase stack", () => {
  const env = parsePublicEnv();

  it("serves the auth API", async () => {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    });
    expect(response.status).toBe(200);
  });

  it("serves the REST API to the anon role", async () => {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    });
    expect(response.ok).toBe(true);
  });
});
