import { describe, expect, it } from "vitest";
import { EnvValidationError, parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parsePublicEnv", () => {
  it("returns typed values when all variables are valid", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("reads from process.env by default", () => {
    const original = { ...process.env };
    Object.assign(process.env, valid);
    try {
      expect(parsePublicEnv()).toEqual(valid);
    } finally {
      process.env = original;
    }
  });

  it("names every missing variable", () => {
    expect(() => parsePublicEnv({})).toThrowError(
      "Missing or invalid environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });

  it("rejects an empty anon key", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })).toThrowError(
      EnvValidationError,
    );
  });

  it("rejects a malformed URL without leaking its value", () => {
    try {
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url-secret" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).variables).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
      expect((error as Error).message).not.toContain("not-a-url-secret");
    }
  });
});
