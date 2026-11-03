import type { IsoDate } from "@/lib/readiness/types";

/** Time zone used to decide what "today" is. Matches the local database's `current_date` (UTC). */
export const SITE_TIME_ZONE = "UTC";

/** Today's calendar date in `timeZone`, as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date(), timeZone: string = SITE_TIME_ZONE): IsoDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** "Tue 4 Nov" style label for a work date. */
export function formatWorkDate(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(",", "");
}

/** "Today", "Tomorrow" or the formatted date, relative to `today`. */
export function relativeDayLabel(date: IsoDate, today: IsoDate): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return formatWorkDate(date);
}
