import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const { getCurrentUser, requireRole } = await import("./session");

interface FakeOptions {
  user?: { id: string } | null;
  authError?: Error | null;
  profile?: { display_name: string; role: string } | null;
  profileError?: Error | null;
  throws?: boolean;
}

function fakeClient(options: FakeOptions = {}): SupabaseClient {
  const {
    user = { id: "u1" },
    authError = null,
    profile = { display_name: "Sam (SAMPLE)", role: "team_leader" },
    profileError = null,
    throws = false,
  } = options;
  const single = vi.fn(async () => ({ data: profile, error: profileError }));
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (throws) throw new Error("network");
        return { data: { user }, error: authError };
      }),
    },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ single }) }) })),
  } as unknown as SupabaseClient;
}

describe("getCurrentUser", () => {
  it("returns the user with their profile", async () => {
    await expect(getCurrentUser(fakeClient())).resolves.toEqual({
      id: "u1",
      displayName: "Sam (SAMPLE)",
      role: "team_leader",
    });
  });

  it.each<[string, FakeOptions]>([
    ["no session", { user: null }],
    ["an auth error", { authError: new Error("expired") }],
    ["no profile", { profile: null }],
    ["a profile error", { profileError: new Error("denied") }],
    ["an unknown role", { profile: { display_name: "X", role: "admin" } }],
    ["a network failure", { throws: true }],
  ])("returns null for %s", async (_label, options) => {
    await expect(getCurrentUser(fakeClient(options))).resolves.toBeNull();
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("returns the user when the role matches", async () => {
    await expect(requireRole("team_leader", fakeClient())).resolves.toMatchObject({ id: "u1" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects signed-out users to sign-in", async () => {
    await expect(requireRole("team_leader", fakeClient({ user: null }))).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in",
    );
  });

  it("redirects the other role to its own home", async () => {
    await expect(requireRole("project_manager", fakeClient())).rejects.toThrow(
      "NEXT_REDIRECT:/planned-work",
    );
  });
});
