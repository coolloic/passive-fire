import { describe, expect, it } from "vitest";
import { normaliseSolution } from "./parse";
import { renderCatalogueSql, renderSampleProductsSql, sqlLiteral } from "./seed-sql";

describe("sqlLiteral", () => {
  it.each([
    [null, "null"],
    [true, "true"],
    [false, "false"],
    [42, "42"],
    [12.5, "12.5"],
    [0, "0"],
    ["0334", "'0334'"],
    ["O'Brien", "'O''Brien'"],
    ["", "''"],
    [[], "'{}'::text[]"],
    [["a", "b'c"], "array['a', 'b''c']::text[]"],
  ])("renders %j as %s", (value, expected) => {
    expect(sqlLiteral(value)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (value) => {
    expect(() => sqlLiteral(value)).toThrowError(/non-finite/);
  });
});

const solution = normaliseSolution({
  "Internal Code": "0334",
  "Supplier Ref. Code": "V1.11",
  Supplier: "Ryanfire",
  Orientation: "Wall",
  Substrate: "Concrete, concrete wall",
  "Service Classification": "Non-Combustible Pipe",
  "Service Type": "Copper Pipe",
  "Service Size": "Ø100mm",
  Integrity: "60",
  Insulation: "-",
  "Service Type Option": "Copper Pipe",
  "Substrate Option": "Concrete Wall",
});

describe("renderCatalogueSql", () => {
  it("renders one insert with a row per solution", () => {
    const sql = renderCatalogueSql([solution, { ...solution, internalCode: "0335" }]);
    expect(sql).toContain("-- 2 solutions");
    expect(sql).toContain("insert into public.solutions (internal_code,");
    expect(sql).toContain("('0334', 'V1.11'");
    expect(sql).toContain("array['substrate_thickness_unknown']::text[]");
    expect(sql.trimEnd().endsWith(");")).toBe(true);
  });

  it("renders only the header for an empty catalogue", () => {
    const sql = renderCatalogueSql([]);
    expect(sql).toContain("-- 0 solutions");
    expect(sql).not.toContain("insert into");
  });

  it("is deterministic", () => {
    expect(renderCatalogueSql([solution])).toBe(renderCatalogueSql([solution]));
  });
});

describe("renderSampleProductsSql", () => {
  const products = [{ sku: "SAMPLE-A", name: "Collar 'A' (SAMPLE)", unit: "each" as const }];
  const requirements = [{ internalCode: "0334", sku: "SAMPLE-A", quantityPerPenetration: 0.4 }];

  it("inserts products and joins requirements on internal code and SKU", () => {
    const sql = renderSampleProductsSql(products, requirements);
    expect(sql).toContain("-- 1 products, 1 requirements.");
    expect(sql).toContain("('SAMPLE-A', 'Collar ''A'' (SAMPLE)', 'each', true)");
    expect(sql).toContain("('0334', 'SAMPLE-A', 0.4)");
    expect(sql).toContain("join public.solutions s on s.internal_code = v.internal_code");
  });

  it("omits empty sections", () => {
    const sql = renderSampleProductsSql([], []);
    expect(sql).not.toContain("insert into");
  });
});
