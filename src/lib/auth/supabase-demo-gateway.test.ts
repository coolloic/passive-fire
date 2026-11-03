import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/server-client", () => ({ createServerSupabaseClient: vi.fn() }));

const { createSupabaseDemoGateway } = await import("./supabase-demo-gateway");

function admin(result: { data?: unknown; error?: Error | null }) {
  const generateLink = vi.fn(async () => ({ data: result.data, error: result.error ?? null }));
  return {
    client: { auth: { admin: { generateLink } } } as unknown as SupabaseClient,
    generateLink,
  };
}

function user(error: Error | null = null) {
  const verifyOtp = vi.fn(async () => ({ error }));
  return { client: { auth: { verifyOtp } } as unknown as SupabaseClient, verifyOtp };
}

describe("createSupabaseDemoGateway", () => {
  it("issues a magic-link token with the admin client", async () => {
    const privileged = admin({ data: { properties: { hashed_token: "hash" } } });
    const gateway = createSupabaseDemoGateway(privileged.client, user().client);
    await expect(gateway.issueSignInToken("team.leader@example.com")).resolves.toBe("hash");
    expect(privileged.generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "team.leader@example.com",
    });
  });

  it("throws when the token cannot be issued", async () => {
    const gateway = createSupabaseDemoGateway(
      admin({ error: new Error("nope") }).client,
      user().client,
    );
    await expect(gateway.issueSignInToken("x@example.com")).rejects.toThrow("nope");
  });

  it("redeems the token with the user-scoped client", async () => {
    const scoped = user();
    const gateway = createSupabaseDemoGateway(admin({}).client, scoped.client);
    await gateway.redeemSignInToken("hash");
    expect(scoped.verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "hash" });
  });

  it("throws when the token cannot be redeemed", async () => {
    const gateway = createSupabaseDemoGateway(admin({}).client, user(new Error("expired")).client);
    await expect(gateway.redeemSignInToken("hash")).rejects.toThrow("expired");
  });
});
