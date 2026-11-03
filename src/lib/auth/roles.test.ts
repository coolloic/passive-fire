import { describe, expect, it } from "vitest";
import { HOME_PATH, isUserRole, requiredRoleFor } from "./roles";

describe("requiredRoleFor", () => {
  it.each([
    ["/planned-work", "team_leader"],
    ["/planned-work/abc", "team_leader"],
    ["/escalations", "team_leader"],
    ["/inbox", "project_manager"],
    ["/inbox/123", "project_manager"],
  ])("%s needs %s", (path, role) => {
    expect(requiredRoleFor(path)).toBe(role);
  });

  it.each(["/", "/sign-in", "/offline", "/planned-workshop", "/inboxes", "/manifest.webmanifest"])(
    "%s is public",
    (path) => {
      expect(requiredRoleFor(path)).toBeNull();
    },
  );
});

describe("HOME_PATH", () => {
  it("sends each role to its own home", () => {
    expect(HOME_PATH).toEqual({ team_leader: "/planned-work", project_manager: "/inbox" });
  });
});

describe("isUserRole", () => {
  it.each([
    ["team_leader", true],
    ["project_manager", true],
    ["admin", false],
    [null, false],
    [undefined, false],
  ])("%j → %s", (value, expected) => {
    expect(isUserRole(value)).toBe(expected);
  });
});
