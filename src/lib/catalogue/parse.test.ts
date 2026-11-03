import { describe, expect, it } from "vitest";
import {
  collapseWhitespace,
  normaliseSolution,
  parseCatalogue,
  parseServiceSize,
  parseSubstrate,
} from "./parse";

const PIPE = "Combustible Pipe";
const ELECTRICAL = "Electrical Penetration";

describe("collapseWhitespace", () => {
  it("collapses internal runs and trims", () => {
    expect(collapseWhitespace("  Copper Pipe  - 38mm   Nitrile ")).toBe(
      "Copper Pipe - 38mm Nitrile",
    );
  });
});

describe("parseServiceSize", () => {
  it.each([
    ["Ø50mm", 50],
    ["Ø 100mm", 100],
    ["ø16mm", 16],
    ["Ø22.5mm", 22.5],
  ])("reads %s as a round service of %d mm", (raw, diameter) => {
    expect(parseServiceSize(raw, PIPE, false)).toEqual({
      shape: "round",
      diameterMm: diameter,
      widthMm: null,
      heightMm: null,
      flags: [],
    });
  });

  it("reads a pipe size without Ø as a diameter and flags it", () => {
    expect(parseServiceSize("80mm", "Non-Combustible Pipe", false)).toMatchObject({
      shape: "round",
      diameterMm: 80,
      flags: ["diameter_symbol_missing"],
    });
  });

  it("infers millimetres for a bare number and flags it (spec A-7)", () => {
    expect(parseServiceSize("60", "Insulated Pipe", false)).toMatchObject({
      shape: "round",
      diameterMm: 60,
      flags: ["size_unit_inferred", "diameter_symbol_missing"],
    });
  });

  it.each([
    ["900mm x 50mm", 900, 50],
    ["1000x1000mm", 1000, 1000],
    ["2950x3000mm", 2950, 3000],
  ])("reads %s as a rectangular opening", (raw, width, height) => {
    expect(parseServiceSize(raw, ELECTRICAL, false)).toEqual({
      shape: "rectangular",
      diameterMm: null,
      widthMm: width,
      heightMm: height,
      flags: [],
    });
  });

  it("keeps a large Blank opening rectangular", () => {
    expect(parseServiceSize("1000x1000mm", "Other", true).shape).toBe("rectangular");
  });

  it.each([
    ["1100x10mm", 10, 1100],
    ["75x1100mm", 75, 1100],
    ["1100x75mm", 75, 1100],
  ])("reads Blank %s as a linear joint: gap width then length", (raw, width, length) => {
    expect(parseServiceSize(raw, "Other", true)).toEqual({
      shape: "linear",
      diameterMm: null,
      widthMm: width,
      heightMm: length,
      flags: [],
    });
  });

  it("treats a Blank opening just over 75 mm wide as rectangular", () => {
    expect(parseServiceSize("1100x76mm", "Other", true).shape).toBe("rectangular");
  });

  it("reads a single Blank width as a linear joint of unknown length", () => {
    expect(parseServiceSize("50mm", "Other", true)).toEqual({
      shape: "linear",
      diameterMm: null,
      widthMm: 50,
      heightMm: null,
      flags: ["length_unknown"],
    });
  });

  it("reads a bare number on a Blank row as a joint width with the unit inferred", () => {
    expect(parseServiceSize("75", "Other", true).flags).toEqual([
      "size_unit_inferred",
      "length_unknown",
    ]);
  });

  it("reads a single dimension on a non-pipe service as rectangular and flags it", () => {
    expect(parseServiceSize("300mm", ELECTRICAL, false)).toMatchObject({
      shape: "rectangular",
      widthMm: 300,
      heightMm: null,
      flags: ["single_dimension"],
    });
  });

  it.each(["", "   ", "large", "Ø", "50cm", "10x", "x10mm"])("flags %j as unparsed", (raw) => {
    expect(parseServiceSize(raw, PIPE, false)).toEqual({
      shape: "unknown",
      diameterMm: null,
      widthMm: null,
      heightMm: null,
      flags: ["size_unparsed"],
    });
  });
});

describe("parseSubstrate", () => {
  it.each([
    ["FR plasterboard, FR plasterboard wall (1 layer 13mm)", "FR plasterboard", 13],
    ["FR plasterboard, FR plasterboard wall (2 layers 13mm)", "FR plasterboard", 26],
    ["FR plasterboard, FR plasterboard wall ( 1 layer 13mm)", "FR plasterboard", 13],
    ["FR plasterboard, 102mm FR plasterboard (1 layer 19mm)", "FR plasterboard", 19],
    ["KOROK®, KOROK® wall (51 mm)", "KOROK®", 51],
    ["Concrete, 125mm concrete floor", "Concrete", 125],
    ["Concrete, 75mm linear gap in 120mm concrete floor", "Concrete", 120],
    ["unlined Timber, Ryanfire 90mm Naked Wall System", "Unlined Timber", 90],
  ])("reads %j", (raw, type, thickness) => {
    expect(parseSubstrate(raw)).toEqual({
      substrateType: type,
      substrateThicknessMm: thickness,
      flags: [],
    });
  });

  it("flags a substrate with no measurement", () => {
    expect(parseSubstrate("Concrete, concrete wall")).toEqual({
      substrateType: "Concrete",
      substrateThicknessMm: null,
      flags: ["substrate_thickness_unknown"],
    });
  });

  it("flags a truncated substrate", () => {
    expect(parseSubstrate("FR plasterboard,")).toEqual({
      substrateType: "FR plasterboard",
      substrateThicknessMm: null,
      flags: ["substrate_truncated", "substrate_thickness_unknown"],
    });
  });

  it("treats a value without a comma as type only", () => {
    expect(parseSubstrate("Concrete").substrateType).toBe("Concrete");
  });

  it("returns no type for an empty value", () => {
    expect(parseSubstrate("").substrateType).toBeNull();
  });
});

const baseRecord: Record<string, string> = {
  "Internal Code": "0334",
  "Supplier Ref. Code": "V1.11-22SFR00038-146-E",
  Supplier: "Ryanfire",
  Orientation: "Wall",
  Substrate: "FR plasterboard, FR plasterboard wall (1 layer 13mm)",
  "Service Classification": "Non-Combustible Pipe",
  "Service Type": "Copper Pipe",
  "Service Size": "Ø100mm",
  Integrity: "60",
  Insulation: "-",
  "Service Type Option": "Copper Pipe",
  "Substrate Option": "Plasterboard Wall",
};

describe("normaliseSolution", () => {
  it("keeps raw columns and adds cleaned fields", () => {
    expect(normaliseSolution(baseRecord)).toEqual({
      internalCode: "0334",
      supplierRefCode: "V1.11-22SFR00038-146-E",
      supplier: "Ryanfire",
      orientation: "Wall",
      substrateRaw: "FR plasterboard, FR plasterboard wall (1 layer 13mm)",
      serviceClassification: "Non-Combustible Pipe",
      serviceTypeRaw: "Copper Pipe",
      serviceSizeRaw: "Ø100mm",
      integrityRaw: "60",
      insulationRaw: "-",
      serviceTypeOption: "Copper Pipe",
      substrateOption: "Plasterboard Wall",
      shape: "round",
      diameterMm: 100,
      widthMm: null,
      heightMm: null,
      substrateType: "FR plasterboard",
      substrateThicknessMm: 13,
      integrityMinutes: 60,
      insulationMinutes: null,
      parseFlags: [],
    });
  });

  it("keeps the internal code's leading zeros", () => {
    expect(normaliseSolution({ ...baseRecord, "Internal Code": " 0042 " }).internalCode).toBe(
      "0042",
    );
  });

  it("recognises Blank rows despite spacing and case", () => {
    const solution = normaliseSolution({
      ...baseRecord,
      "Service Type": " blank ",
      "Service Size": "1100x10mm",
    });
    expect(solution.shape).toBe("linear");
  });

  it("flags ratings that are not whole minutes", () => {
    const solution = normaliseSolution({ ...baseRecord, Integrity: "EI 60", Insulation: "0" });
    expect(solution.integrityMinutes).toBeNull();
    expect(solution.insulationMinutes).toBeNull();
    expect(solution.parseFlags).toEqual(["integrity_unparsed", "insulation_unparsed"]);
  });

  it("does not flag an Insulation of '-' (no rating, spec A-8)", () => {
    expect(normaliseSolution(baseRecord).parseFlags).toEqual([]);
  });

  it("rejects an empty internal code", () => {
    expect(() => normaliseSolution({ ...baseRecord, "Internal Code": "  " })).toThrowError(
      /empty Internal Code/,
    );
  });

  it("names a missing column", () => {
    const record = { ...baseRecord };
    delete record.Substrate;
    expect(() => normaliseSolution(record)).toThrowError(/"Substrate" column/);
  });
});

describe("parseCatalogue", () => {
  const header = Object.keys(baseRecord).join(",");
  const row = (code: string) =>
    Object.values({ ...baseRecord, "Internal Code": code })
      .map((value) => (value.includes(",") ? `"${value}"` : value))
      .join(",");

  it("parses every row", () => {
    const solutions = parseCatalogue(`${header}\n${row("0001")}\n${row("0002")}\n`);
    expect(solutions.map((solution) => solution.internalCode)).toEqual(["0001", "0002"]);
  });

  it("rejects duplicate internal codes", () => {
    expect(() => parseCatalogue(`${header}\n${row("0001")}\n${row("0001")}\n`)).toThrowError(
      /Duplicate Internal Code 0001/,
    );
  });

  it("returns nothing for a header-only file", () => {
    expect(parseCatalogue(`${header}\n`)).toEqual([]);
  });
});
