import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, securityHeaderRoutes } from "./headers.mjs";

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

describe("security headers", () => {
  it("forbids framing by any site (clickjacking)", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Content-Security-Policy")).toBe("frame-ancestors 'none'");
  });

  it("stops MIME sniffing and limits referrer data", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("switches off device features the app never uses", () => {
    expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("has no duplicate or empty headers", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(SECURITY_HEADERS.every((h) => h.value.trim().length > 0)).toBe(true);
  });

  it("applies to every route", async () => {
    await expect(securityHeaderRoutes()).resolves.toEqual([
      { source: "/:path*", headers: SECURITY_HEADERS },
    ]);
  });
});
