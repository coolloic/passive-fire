import { InvalidReadinessInputError, type IsoDate } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Throws unless `value` is a real calendar date written as `YYYY-MM-DD`. */
export function assertIsoDate(value: string, label: string): asserts value is IsoDate {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !ISO_DATE.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new InvalidReadinessInputError(`${label} must be a YYYY-MM-DD date, got "${value}"`);
  }
}
