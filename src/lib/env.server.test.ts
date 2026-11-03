import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseServerEnv } = await import("./env.server");
const { EnvValidationError } = await import("./env");

describe("parseServerEnv", () => {
  it("returns the service role key when present", () => {
    expect(parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: "secret" })).toEqual({
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    });
  });

  it("reads from process.env by default", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "from-env");
    expect(parseServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBe("from-env");
    vi.unstubAllEnvs();
  });

  it.each([{}, { SUPABASE_SERVICE_ROLE_KEY: "" }])(
    "names the missing variable without its value (%j)",
    (raw) => {
      expect(() => parseServerEnv(raw)).toThrowError(EnvValidationError);
      expect(() => parseServerEnv(raw)).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
    },
  );
});

describe("getAnthropicApiKey", () => {
  it("returns the key, trimmed", async () => {
    const { getAnthropicApiKey } = await import("./env.server");
    expect(getAnthropicApiKey(" key ")).toBe("key");
  });

  it.each([undefined, "", "   "])("returns null when unset (%j)", async (raw) => {
    const { getAnthropicApiKey } = await import("./env.server");
    expect(getAnthropicApiKey(raw)).toBeNull();
  });

  it("reads process.env by default", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "from-env");
    const { getAnthropicApiKey } = await import("./env.server");
    expect(getAnthropicApiKey()).toBe("from-env");
    vi.unstubAllEnvs();
  });
});
