import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const signInAsDemoPersona = vi.fn();
const signOutFn = vi.fn();
const loggerError = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/demo-sign-in", () => ({ signInAsDemoPersona }));
vi.mock("@/lib/auth/supabase-demo-gateway", () => ({ createSupabaseDemoGateway: () => ({}) }));
vi.mock("@/lib/supabase/server-client", () => ({
  createServerSupabaseClient: () => ({ auth: { signOut: signOutFn } }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: loggerError } }));

const { signInAsDemo, signOut } = await import("./actions");

describe("signInAsDemo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the persona's home on success", async () => {
    signInAsDemoPersona.mockResolvedValue({ ok: true, redirectTo: "/planned-work" });
    await expect(signInAsDemo("team_leader")).rejects.toThrow("NEXT_REDIRECT:/planned-work");
    expect(signInAsDemoPersona).toHaveBeenCalledWith("team_leader", {});
  });

  it("returns the failure message", async () => {
    signInAsDemoPersona.mockResolvedValue({ ok: false, message: "Choose a demo persona." });
    await expect(signInAsDemo("nobody")).resolves.toEqual({ message: "Choose a demo persona." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("logs and returns a friendly message on unexpected errors", async () => {
    signInAsDemoPersona.mockRejectedValue(new Error("env missing"));
    await expect(signInAsDemo("team_leader")).resolves.toEqual({
      message: "Sign-in is unavailable right now. Please try again.",
    });
    expect(loggerError).toHaveBeenCalled();
  });
});

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends the session and returns to sign-in", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(signOutFn).toHaveBeenCalled();
  });

  it("still returns to sign-in if sign-out fails, and logs it", async () => {
    signOutFn.mockRejectedValueOnce(new Error("offline"));
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(loggerError).toHaveBeenCalled();
  });
});
