import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCatalogue } from "../catalogue/parse";
import { requirementsFor } from "../catalogue/requirement-rules";
import { SAMPLE_PRODUCTS } from "../catalogue/sample-products";
import { relativeDate, renderSampleSiteSql } from "./seed-sql";
import {
  SAMPLE_DELIVERIES,
  SAMPLE_PERSONAS,
  SAMPLE_PLANNED_WORK,
  SAMPLE_SCENARIOS,
  SAMPLE_STOCK,
  type SampleScenario,
} from "./site";

const catalogue = parseCatalogue(readFileSync("docs/solutions-excerpt.csv", "utf8"));
const codes = new Set(catalogue.map((solution) => solution.internalCode));
const skus = new Set(SAMPLE_PRODUCTS.map((product) => product.sku));
const covered = new Set(catalogue.flatMap(requirementsFor).map((row) => row.internalCode));

describe("SAMPLE site data", () => {
  it("nominates only solutions that exist in the catalogue", () => {
    const nominated = SAMPLE_SCENARIOS.flatMap((scenario) =>
      scenario.nominatedCode ? [scenario.nominatedCode] : [],
    );
    expect(nominated.every((code) => codes.has(code))).toBe(true);
  });

  it("references only scenarios that exist", () => {
    const keys = new Set(SAMPLE_SCENARIOS.map((scenario) => scenario.key));
    const used = SAMPLE_PLANNED_WORK.flatMap((work) => work.items.map((item) => item.scenarioKey));
    expect(used.every((key) => keys.has(key))).toBe(true);
  });

  it("references only SAMPLE products in stock and deliveries", () => {
    expect([...SAMPLE_STOCK, ...SAMPLE_DELIVERIES].every((row) => skus.has(row.sku))).toBe(true);
  });

  it("has unique ids", () => {
    const ids = [
      ...SAMPLE_PERSONAS.map((row) => row.id),
      ...SAMPLE_SCENARIOS.map((row) => row.id),
      ...SAMPLE_PLANNED_WORK.map((row) => row.id),
      ...SAMPLE_DELIVERIES.map((row) => row.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every readiness case the demo must show (spec AC-14.4)", () => {
    const expected = new Set(SAMPLE_PLANNED_WORK.map((work) => work.expected));
    expect(expected).toEqual(new Set(["past", "ready", "short", "unknown"]));
    expect(SAMPLE_SCENARIOS.some((scenario) => scenario.nominatedCode === null)).toBe(true);
    expect(
      SAMPLE_SCENARIOS.some(
        (scenario) => scenario.nominatedCode && !covered.has(scenario.nominatedCode),
      ),
    ).toBe(true);
    expect(SAMPLE_DELIVERIES.some((delivery) => delivery.dayOffset < 0)).toBe(true);
    const pw3 = SAMPLE_PLANNED_WORK.find((work) => work.key === "PW3")!;
    expect(SAMPLE_DELIVERIES.some((delivery) => delivery.dayOffset === pw3.dayOffset)).toBe(true);
  });

  it("puts planned work within the next 14 days, except the past one", () => {
    for (const work of SAMPLE_PLANNED_WORK) {
      if (work.expected === "past") expect(work.dayOffset).toBeLessThan(0);
      else expect(work.dayOffset).toBeGreaterThanOrEqual(0);
      if (work.expected !== "past") expect(work.dayOffset).toBeLessThanOrEqual(13);
    }
  });

  it("matches the committed seed (run `pnpm db:seed:generate` if this fails)", () => {
    expect(renderSampleSiteSql(catalogue)).toBe(
      readFileSync("supabase/seed/03_sample_site.sql", "utf8"),
    );
  });
});

describe("relativeDate", () => {
  it.each([
    [0, "current_date"],
    [1, "current_date + 1"],
    [-3, "current_date - 3"],
  ])("renders offset %d as %s", (offset, expected) => {
    expect(relativeDate(offset)).toBe(expected);
  });
});

describe("renderSampleSiteSql", () => {
  it("creates demo users with unknowable passwords and relative dates", () => {
    const sql = renderSampleSiteSql(catalogue);
    expect(sql).toContain("extensions.crypt(gen_random_uuid()::text");
    expect(sql).toContain("current_date + 1");
    expect(sql).toContain("current_date - 3");
    expect(sql).not.toMatch(/password\s*=/i);
  });

  it("rejects a scenario that nominates an unknown solution", () => {
    const broken = catalogue.filter((solution) => solution.internalCode !== "0798");
    expect(() => renderSampleSiteSql(broken)).toThrowError(/unknown solution 0798/);
  });

  it("rejects planned work that uses an unknown scenario", () => {
    const item = SAMPLE_PLANNED_WORK[1]!.items[0]!;
    const original = item.scenarioKey;
    try {
      (item as { scenarioKey: string }).scenarioKey = "S99";
      expect(() => renderSampleSiteSql(catalogue)).toThrowError(/unknown scenario S99/);
    } finally {
      (item as { scenarioKey: string }).scenarioKey = original;
    }
  });

  it("rejects an unnominated scenario without attributes", () => {
    const scenario = SAMPLE_SCENARIOS.find((row) => row.nominatedCode === null) as SampleScenario;
    const attributes = scenario.attributes;
    try {
      delete (scenario as { attributes?: unknown }).attributes;
      expect(() => renderSampleSiteSql(catalogue)).toThrowError(/needs attributes/);
    } finally {
      (scenario as { attributes?: unknown }).attributes = attributes;
    }
  });
});
