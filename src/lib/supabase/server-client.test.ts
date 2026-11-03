import { beforeEach, describe, expect, it, vi } from "vitest";

interface CookieToSet {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

interface CookieAdapter {
  getAll: () => unknown;
  setAll: (cookies: CookieToSet[]) => void;
}

const cookieStore = { getAll: vi.fn(() => [{ name: "a", value: "1" }]), set: vi.fn() };
const createServerClient =
  vi.fn<(url: string, key: string, options: { cookies: CookieAdapter }) => object>();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => cookieStore }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

async function createClientAndGetAdapter(): Promise<CookieAdapter> {
  const { createServerSupabaseClient } = await import("./server-client");
  createServerSupabaseClient();
  return createServerClient.mock.calls[0][2].cookies;
}

describe("createServerSupabaseClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createServerClient.mockReset().mockReturnValue({ kind: "server" });
    cookieStore.set.mockReset();
  });

  it("creates a client with the anon key and request cookies", async () => {
    const adapter = await createClientAndGetAdapter();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.any(Object),
    );
    expect(adapter.getAll()).toEqual([{ name: "a", value: "1" }]);
  });

  it("writes refreshed cookies when allowed", async () => {
    const adapter = await createClientAndGetAdapter();

    adapter.setAll([{ name: "sb", value: "token", options: { path: "/" } }]);

    expect(cookieStore.set).toHaveBeenCalledWith("sb", "token", { path: "/" });
  });

  it("ignores cookie writes from read-only Server Components", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("read-only");
    });
    const adapter = await createClientAndGetAdapter();

    expect(() => adapter.setAll([{ name: "sb", value: "x", options: {} }])).not.toThrow();
  });
});
