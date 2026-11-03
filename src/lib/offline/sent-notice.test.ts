import { beforeEach, describe, expect, it } from "vitest";
import { SENT_NOTICE_MAX_AGE_MS, rememberSent, recentlySent } from "./sent-notice";

const NOW = 1_800_000_000_000;
const KEY = "team-leader-outbox-sent";

describe("sent notice", () => {
  beforeEach(() => sessionStorage.clear());

  it("keeps returning the remembered count until it expires, then forgets it", () => {
    rememberSent("u1", 2, NOW);
    expect(recentlySent("u1", NOW + 1000)).toBe(2);
    expect(recentlySent("u1", NOW + 2000)).toBe(2);
    expect(recentlySent("u1", NOW + SENT_NOTICE_MAX_AGE_MS + 1)).toBe(0);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns 0 when nothing was remembered", () => {
    expect(recentlySent("u1", NOW)).toBe(0);
  });

  it.each([
    ["at the age limit", SENT_NOTICE_MAX_AGE_MS, 1],
    ["past the age limit", SENT_NOTICE_MAX_AGE_MS + 1, 0],
    ["from the future", -1, 0],
  ])("handles a count %s", (_label, age, expected) => {
    rememberSent("u1", 1, NOW);
    expect(recentlySent("u1", NOW + age)).toBe(expected);
  });

  it.each([
    ["not JSON", "{"],
    ["not an object", "3"],
    ["null", "null"],
    ["missing a time", JSON.stringify({ userId: "u1", count: 1 })],
    ["a zero count", JSON.stringify({ userId: "u1", count: 0, at: NOW })],
    ["a negative count", JSON.stringify({ userId: "u1", count: -2, at: NOW })],
    ["a text count", JSON.stringify({ userId: "u1", count: "2", at: NOW })],
    ["another user's", JSON.stringify({ userId: "u2", count: 1, at: NOW })],
  ])("ignores a stored value that is %s and forgets it", (_label, raw) => {
    sessionStorage.setItem(KEY, raw);
    expect(recentlySent("u1", NOW)).toBe(0);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("rounds a fractional count down", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ userId: "u1", count: 2.7, at: NOW }));
    expect(recentlySent("u1", NOW)).toBe(2);
  });

  it("copes when storage is unavailable", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    expect(() => rememberSent("u1", 1, NOW, blocked)).not.toThrow();
    expect(recentlySent("u1", NOW, blocked)).toBe(0);
  });

  it("copes when an expired value cannot be removed", () => {
    const readOnly = () => ({
      getItem: () => "{",
      setItem: () => {},
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(recentlySent("u1", NOW, readOnly)).toBe(0);
  });

  it("uses the current time by default", () => {
    rememberSent("u1", 1);
    expect(recentlySent("u1")).toBe(1);
  });
});
