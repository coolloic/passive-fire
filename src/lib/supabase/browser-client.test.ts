import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn(() => ({ kind: "client" }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

describe("getBrowserSupabaseClient", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    createBrowserClient.mockClear();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("creates the client once with validated env", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const { getBrowserSupabaseClient } = await import("./browser-client");

    const first = getBrowserSupabaseClient();
    const second = getBrowserSupabaseClient();

    expect(first).toBe(second);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "anon-key");
  });

  it("fails fast when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { getBrowserSupabaseClient } = await import("./browser-client");

    expect(() => getBrowserSupabaseClient()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});
