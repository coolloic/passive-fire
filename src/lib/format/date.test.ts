import { describe, expect, it } from "vitest";
import { addDays, formatWorkDate, relativeDayLabel, todayIso } from "./date";

describe("todayIso", () => {
  it("formats the date in the given time zone", () => {
    const instant = new Date("2026-11-03T23:30:00Z");
    expect(todayIso(instant, "UTC")).toBe("2026-11-03");
    expect(todayIso(instant, "Pacific/Auckland")).toBe("2026-11-04");
  });

  it("defaults to now in UTC", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDays", () => {
  it.each([
    ["2026-11-03", 1, "2026-11-04"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-11-03", 0, "2026-11-03"],
    ["2026-11-03", 13, "2026-11-16"],
  ])("%s + %d = %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe("formatWorkDate", () => {
  it("shows weekday, day and month", () => {
    expect(formatWorkDate("2026-11-03")).toBe("Tue 3 Nov");
  });
});

describe("relativeDayLabel", () => {
  it.each([
    ["2026-11-03", "Today"],
    ["2026-11-04", "Tomorrow"],
    ["2026-11-05", "Thu 5 Nov"],
  ])("%s relative to 2026-11-03 is %s", (date, label) => {
    expect(relativeDayLabel(date, "2026-11-03")).toBe(label);
  });
});
