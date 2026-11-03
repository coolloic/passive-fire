import { describe, expect, it } from "vitest";
import {
  decidePageCaching,
  isOfflinePlannedWorkPage,
  isPrivatePage,
  type CacheableRequest,
} from "./routes";

const ID = "a0000000-0000-4000-8005-000000000003";

const request = (overrides: Partial<CacheableRequest>): CacheableRequest => ({
  method: "GET",
  mode: "navigate",
  sameOrigin: true,
  pathname: "/planned-work",
  isRscRequest: false,
  isOfflinePrefetch: false,
  ...overrides,
});

describe("isOfflinePlannedWorkPage", () => {
  it.each([
    "/planned-work",
    "/planned-work/",
    `/planned-work/${ID}`,
    `/planned-work/${ID.toUpperCase()}`,
  ])("%s may be offline", (path) => {
    expect(isOfflinePlannedWorkPage(path)).toBe(true);
  });

  it.each([
    `/planned-work/${ID}/escalate`,
    "/planned-work/abc",
    "/planned-workshop",
    "/escalations",
    "/inbox",
  ])("%s may not", (path) => {
    expect(isOfflinePlannedWorkPage(path)).toBe(false);
  });
});

describe("isPrivatePage", () => {
  it.each([
    "/planned-work",
    `/planned-work/${ID}/escalate`,
    "/escalations",
    "/escalations/1",
    "/inbox",
    "/inbox/1",
  ])("%s is private", (path) => {
    expect(isPrivatePage(path)).toBe(true);
  });

  it.each([
    "/",
    "/sign-in",
    "/offline",
    "/planned-workshop",
    "/_next/static/chunk.js",
    "/icons/icon-192.png",
  ])("%s is not", (path) => {
    expect(isPrivatePage(path)).toBe(false);
  });
});

describe("decidePageCaching", () => {
  it("caches navigations to the Planned Work list and detail", () => {
    expect(decidePageCaching(request({}))).toBe("offline-cache");
    expect(decidePageCaching(request({ pathname: `/planned-work/${ID}` }))).toBe("offline-cache");
  });

  it("caches the app's offline pre-loads of detail pages", () => {
    expect(
      decidePageCaching(
        request({ mode: "cors", isOfflinePrefetch: true, pathname: `/planned-work/${ID}` }),
      ),
    ).toBe("offline-cache");
  });

  it.each([
    ["the escalate form", { pathname: `/planned-work/${ID}/escalate` }],
    ["the project manager inbox", { pathname: "/inbox" }],
    ["an escalation", { pathname: "/escalations/1" }],
    ["Next.js data requests for planned work", { isRscRequest: true }],
    ["a plain fetch of a planned work page", { mode: "cors" }],
  ])("never caches %s", (_label, overrides) => {
    expect(decidePageCaching(request(overrides))).toBe("network-only");
  });

  it.each([
    ["public pages", { pathname: "/sign-in" }],
    ["static assets", { pathname: "/_next/static/app.js", mode: "no-cors" }],
    ["other origins", { sameOrigin: false }],
    ["non-GET requests", { method: "POST" }],
  ])("leaves %s to the default rules", (_label, overrides) => {
    expect(decidePageCaching(request(overrides))).toBe("default");
  });
});
