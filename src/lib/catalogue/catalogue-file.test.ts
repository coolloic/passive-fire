import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCatalogue } from "./parse";
import { requirementsFor } from "./requirement-rules";
import { SAMPLE_PRODUCTS } from "./sample-products";
import { renderCatalogueSql, renderSampleProductsSql } from "./seed-sql";

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

describe("SAMPLE product requirements for the supplied catalogue", () => {
  const requirements = solutions.flatMap(requirementsFor);
  const covered = new Set(requirements.map((row) => row.internalCode));
  const uncovered = solutions.filter((solution) => !covered.has(solution.internalCode));

  it("covers every solution a rule applies to", () => {
    expect(covered.size).toBe(135);
    expect(requirements).toHaveLength(242);
  });

  it("leaves exactly the solutions no rule fits without requirements (shown as Unknown)", () => {
    // Pipes above the 150 mm collar band, single-dimension cable trays, Blank joints of
    // unknown length, and the structural timber beam.
    expect(uncovered.map((solution) => solution.internalCode)).toEqual([
      "0479",
      "0525",
      "0659",
      "0787",
      "0829",
      "0842",
      "0861",
      "0918",
      "0943",
      "0944",
      "0946",
      "0952",
      "0955",
    ]);
  });

  it("uses only positive quantities", () => {
    expect(requirements.every((row) => row.quantityPerPenetration > 0)).toBe(true);
  });

  it("matches the committed seed (run `pnpm db:seed:generate` if this fails)", () => {
    const committed = readFileSync("supabase/seed/02_sample_products.sql", "utf8");
    expect(renderSampleProductsSql(SAMPLE_PRODUCTS, requirements)).toBe(committed);
  });
});
