// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const updateSession = vi.fn(async () => NextResponse.next());
vi.mock("@/lib/supabase/middleware", () => ({ updateSession }));

const { config, middleware } = await import("./middleware");

describe("middleware", () => {
  it("delegates to updateSession", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/inbox"));
    await middleware(req);
    expect(updateSession).toHaveBeenCalledWith(req);
  });

  it("skips static assets and PWA files", () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/planned-work")).toBe(true);
    for (const path of [
      "/_next/static/x.js",
      "/sw.js",
      "/icons/icon-192.png",
      "/manifest.webmanifest",
    ]) {
      expect(pattern.test(path)).toBe(false);
    }
  });
});
