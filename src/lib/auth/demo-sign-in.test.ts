import { describe, expect, it, vi } from "vitest";
import { signInAsDemoPersona, type DemoAuthGateway } from "./demo-sign-in";

function gateway(overrides: Partial<DemoAuthGateway> = {}): DemoAuthGateway {
  return {
    issueSignInToken: vi.fn(async () => "token-hash"),
    redeemSignInToken: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("signInAsDemoPersona", () => {
  it("signs in the SAMPLE team leader and sends them to planned work", async () => {
    const auth = gateway();
    await expect(signInAsDemoPersona("team_leader", auth)).resolves.toEqual({
      ok: true,
      redirectTo: "/planned-work",
    });
    expect(auth.issueSignInToken).toHaveBeenCalledWith("team.leader@example.com");
    expect(auth.redeemSignInToken).toHaveBeenCalledWith("token-hash");
  });

  it("signs in the SAMPLE project manager and sends them to the inbox", async () => {
    await expect(signInAsDemoPersona("project_manager", gateway())).resolves.toEqual({
      ok: true,
      redirectTo: "/inbox",
    });
  });

  it.each([null, "", "admin", 42])(
    "refuses an unknown role (%j) without calling the gateway",
    async (role) => {
      const auth = gateway();
      await expect(signInAsDemoPersona(role, auth)).resolves.toEqual({
        ok: false,
        message: "Choose a demo persona.",
      });
      expect(auth.issueSignInToken).not.toHaveBeenCalled();
    },
  );

  it("reports a friendly error when the token cannot be issued", async () => {
    const auth = gateway({
      issueSignInToken: vi.fn(async () => Promise.reject(new Error("db down"))),
    });
    const result = await signInAsDemoPersona("team_leader", auth);
    expect(result).toEqual({
      ok: false,
      message: "Sign-in is unavailable right now. Please try again.",
    });
  });

  it("reports a friendly error when the token cannot be redeemed", async () => {
    const auth = gateway({
      redeemSignInToken: vi.fn(async () => Promise.reject(new Error("expired"))),
    });
    expect((await signInAsDemoPersona("team_leader", auth)).ok).toBe(false);
  });
});

describe("signInAsDemoPersona without a persona for the role", () => {
  it("reports sign-in as unavailable", async () => {
    vi.resetModules();
    vi.doMock("@/lib/sample-data/site", () => ({ SAMPLE_PERSONAS: [] }));
    const { signInAsDemoPersona: signIn } = await import("./demo-sign-in");
    const auth = gateway();
    await expect(signIn("team_leader", auth)).resolves.toEqual({
      ok: false,
      message: "Sign-in is unavailable right now. Please try again.",
    });
    expect(auth.issueSignInToken).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/sample-data/site");
  });
});
