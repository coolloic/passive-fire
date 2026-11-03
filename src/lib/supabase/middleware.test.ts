// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface CookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void;
}

let user: { id: string } | null = null;
let adapter: CookieAdapter | undefined;
const createServerClient = vi.fn(
  (_url: string, _key: string, options: { cookies: CookieAdapter }) => {
    adapter = options.cookies;
    return { auth: { getUser: async () => ({ data: { user } }) } };
  },
);
vi.mock("@supabase/ssr", () => ({ createServerClient }));

const { updateSession } = await import("./middleware");

const request = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));

describe("updateSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    user = null;
    adapter = undefined;
  });

  it("lets anyone reach public pages", async () => {
    const response = await updateSession(request("/sign-in"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("redirects signed-out users from protected pages to sign-in", async () => {
    const response = await updateSession(request("/planned-work?x=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });

  it("lets signed-in users through and marks protected pages as not cacheable", async () => {
    user = { id: "u1" };
    const response = await updateSession(request("/inbox"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("reads request cookies and writes refreshed session cookies to the response", async () => {
    user = { id: "u1" };
    const incoming = request("/planned-work");
    incoming.cookies.set("sb-access", "old");
    const pending = updateSession(incoming);
    expect(adapter?.getAll()).toEqual([{ name: "sb-access", value: "old" }]);
    adapter?.setAll([{ name: "sb-access", value: "new", options: { path: "/" } }]);
    const response = await pending;
    expect(response.cookies.get("sb-access")?.value).toBe("new");
  });
});
