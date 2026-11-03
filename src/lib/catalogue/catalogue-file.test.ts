import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCatalogue } from "./parse";
import { renderCatalogueSql } from "./seed-sql";

// Guards the real supplied file and the committed seed generated from it.
const csv = readFileSync("docs/solutions-excerpt.csv", "utf8");
const solutions = parseCatalogue(csv);

describe("supplied catalogue", () => {
  it("contains all 148 solutions with leading zeros kept", () => {
    expect(solutions).toHaveLength(148);
    expect(solutions[0]?.internalCode).toBe("0334");
    expect(solutions.every((solution) => /^0\d{3}$/.test(solution.internalCode))).toBe(true);
  });

  it("gives every row a known shape", () => {
    expect(solutions.filter((solution) => solution.shape === "unknown")).toEqual([]);
  });

  it("flags only the rows that need attention", () => {
    const flagged = solutions.filter((solution) => solution.parseFlags.length > 0);
    expect(flagged).toHaveLength(24);
    expect(flagged.flatMap((solution) => solution.parseFlags)).not.toContain("size_unparsed");
  });

  it("matches the committed seed (run `pnpm db:seed:generate` if this fails)", () => {
    const committed = readFileSync("supabase/seed/01_catalogue.sql", "utf8");
    expect(renderCatalogueSql(solutions)).toBe(committed);
  });
});
