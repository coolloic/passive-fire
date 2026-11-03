import { describe, expect, it, vi } from "vitest";

const createClient = vi.fn(() => ({ kind: "admin" }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { createAdminSupabaseClient } = await import("./admin-client");

describe("createAdminSupabaseClient", () => {
  it("uses the service role key without persisting a session", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(createAdminSupabaseClient()).toEqual({ kind: "admin" });
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "service", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    vi.unstubAllEnvs();
  });

  it("fails fast without the service role key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => createAdminSupabaseClient()).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
    vi.unstubAllEnvs();
  });
});
