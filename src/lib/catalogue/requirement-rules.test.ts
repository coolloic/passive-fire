import { describe, expect, it } from "vitest";
import {
  battsForOpening,
  collarBand,
  exposedFaces,
  requirementsFor,
  roundQuantity,
  sealantForDiameter,
} from "./requirement-rules";
import { SAMPLE_PRODUCTS } from "./sample-products";

type Source = Parameters<typeof requirementsFor>[0];

const base: Source = {
  internalCode: "0001",
  serviceClassification: "Combustible Pipe",
  serviceTypeRaw: "PVC Pipe",
  orientation: "Wall",
  shape: "round",
  diameterMm: 50,
  widthMm: null,
  heightMm: null,
  insulationMinutes: 60,
};

const quantities = (source: Source) =>
  Object.fromEntries(requirementsFor(source).map((row) => [row.sku, row.quantityPerPenetration]));

describe("helpers", () => {
  it.each([
    ["Wall", 2],
    [" wall ", 2],
    ["Floor", 1],
    ["Ceiling", 1],
  ])("%s has %d exposed faces", (orientation, faces) => {
    expect(exposedFaces(orientation)).toBe(faces);
  });

  it.each([
    [16, 32],
    [32, 32],
    [33, 50],
    [65, 65],
    [110, 150],
    [150, 150],
    [151, null],
    [225, null],
  ])("a %d mm pipe takes collar band %s", (diameter, band) => {
    expect(collarBand(diameter)).toBe(band);
  });

  it.each([
    [25, 0.1],
    [26, 0.2],
    [100, 0.4],
    [16, 0.1],
    [150, 0.6],
  ])("a %d mm service needs %d sealant cartridges", (diameter, cartridges) => {
    expect(sealantForDiameter(diameter)).toBe(cartridges);
  });

  it("covers an opening with whole batts per exposed face", () => {
    expect(battsForOpening(900, 50, "Wall")).toBe(2);
    expect(battsForOpening(1000, 1000, "Wall")).toBe(4);
    expect(battsForOpening(2950, 3000, "Floor")).toBe(13);
  });

  it("rounds to three decimal places", () => {
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
    expect(roundQuantity(1.23456)).toBe(1.235);
  });
});

describe("requirementsFor", () => {
  it("gives a combustible pipe in a wall two collars and sealant", () => {
    expect(quantities(base)).toEqual({ "SAMPLE-COLLAR-050": 2, "SAMPLE-SEALANT-310": 0.1 });
  });

  it("gives a combustible pipe in a floor one collar", () => {
    expect(quantities({ ...base, orientation: "Floor", diameterMm: 100 })).toEqual({
      "SAMPLE-COLLAR-100": 1,
      "SAMPLE-SEALANT-310": 0.1,
    });
  });

  it("has no rule for a combustible pipe larger than the biggest collar", () => {
    expect(requirementsFor({ ...base, diameterMm: 160 })).toEqual([]);
  });

  it("adds pipe wrap to a non-combustible pipe only when 60+ minutes insulation is required", () => {
    const copper = { ...base, serviceClassification: "Non-Combustible Pipe", diameterMm: 100 };
    expect(quantities({ ...copper, insulationMinutes: 60 })).toEqual({
      "SAMPLE-SEALANT-310": 0.4,
      "SAMPLE-WRAP-M": 0.5,
    });
    expect(quantities({ ...copper, insulationMinutes: 59 })).toEqual({ "SAMPLE-SEALANT-310": 0.4 });
    expect(quantities({ ...copper, insulationMinutes: null })).toEqual({
      "SAMPLE-SEALANT-310": 0.4,
    });
  });

  it("wraps and seals an insulated pipe", () => {
    expect(
      quantities({ ...base, serviceClassification: "Insulated Pipe", diameterMm: 28 }),
    ).toEqual({
      "SAMPLE-WRAP-M": 0.5,
      "SAMPLE-SEALANT-310": 0.2,
    });
  });

  it("seals an electrical conduit by diameter", () => {
    expect(
      quantities({
        ...base,
        serviceClassification: "Electrical Penetration",
        serviceTypeRaw: "PVC Conduit",
      }),
    ).toEqual({ "SAMPLE-SEALANT-310": 0.2 });
  });

  it("covers a cable tray with batts and sealant", () => {
    const tray: Source = {
      ...base,
      serviceClassification: "Electrical Penetration",
      serviceTypeRaw: "Cable Tray D2",
      shape: "rectangular",
      diameterMm: null,
      widthMm: 900,
      heightMm: 50,
    };
    expect(quantities(tray)).toEqual({ "SAMPLE-BATT-1200x600x50": 2, "SAMPLE-SEALANT-310": 0.5 });
  });

  it("has no rule for a cable tray with only one dimension", () => {
    expect(
      requirementsFor({
        ...base,
        serviceClassification: "Electrical Penetration",
        serviceTypeRaw: "Cable Tray D1",
        shape: "rectangular",
        diameterMm: null,
        widthMm: 300,
        heightMm: null,
      }),
    ).toEqual([]);
  });

  it("has no rule for a round tray (unexpected shape)", () => {
    expect(
      requirementsFor({
        ...base,
        serviceClassification: "Electrical Penetration",
        serviceTypeRaw: "Cable Tray",
      }),
    ).toEqual([]);
  });

  it("seals a linear joint per metre of length and 10 mm of width", () => {
    const joint: Source = {
      ...base,
      serviceClassification: "Other",
      serviceTypeRaw: "Blank",
      shape: "linear",
      diameterMm: null,
      widthMm: 35,
      heightMm: 1100,
    };
    expect(quantities(joint)).toEqual({ "SAMPLE-ROD-M": 1.1, "SAMPLE-SEALANT-310": 0.385 });
  });

  it("has no rule for a linear joint of unknown length", () => {
    expect(
      requirementsFor({
        ...base,
        serviceClassification: "Other",
        serviceTypeRaw: "Blank",
        shape: "linear",
        diameterMm: null,
        widthMm: 50,
        heightMm: null,
      }),
    ).toEqual([]);
  });

  it("covers a blank opening with batts", () => {
    expect(
      quantities({
        ...base,
        serviceClassification: "Other",
        serviceTypeRaw: "Blank",
        shape: "rectangular",
        diameterMm: null,
        widthMm: 1000,
        heightMm: 1000,
      }),
    ).toEqual({ "SAMPLE-BATT-1200x600x50": 4, "SAMPLE-SEALANT-310": 0.5 });
  });

  it.each([
    [
      "a structural penetration",
      { serviceClassification: "Structural Penetration", serviceTypeRaw: "Timber Beam" },
    ],
    ["an unknown classification", { serviceClassification: "Mystery" }],
    [
      "an 'Other' service that is not Blank",
      { serviceClassification: "Other", serviceTypeRaw: "Duct" },
    ],
    [
      "a Blank with an unknown shape",
      { serviceClassification: "Other", serviceTypeRaw: "Blank", shape: "unknown" },
    ],
    ["a pipe with no diameter", { diameterMm: null }],
    [
      "a non-combustible pipe with no diameter",
      { serviceClassification: "Non-Combustible Pipe", diameterMm: null },
    ],
    [
      "an insulated pipe with no diameter",
      { serviceClassification: "Insulated Pipe", diameterMm: null },
    ],
    [
      "a conduit with no diameter",
      {
        serviceClassification: "Electrical Penetration",
        serviceTypeRaw: "PVC Conduit",
        diameterMm: null,
      },
    ],
  ] as const)("has no rule for %s", (_label, overrides) => {
    expect(requirementsFor({ ...base, ...overrides } as Source)).toEqual([]);
  });

  it("only uses SKUs from the sample product list", () => {
    const known = new Set(SAMPLE_PRODUCTS.map((product) => product.sku));
    const skus = [
      ...requirementsFor(base),
      ...requirementsFor({ ...base, serviceClassification: "Insulated Pipe" }),
      ...requirementsFor({
        ...base,
        serviceClassification: "Other",
        serviceTypeRaw: "Blank",
        shape: "linear",
        widthMm: 10,
        heightMm: 1100,
      }),
    ].map((row) => row.sku);
    expect(skus.every((sku) => known.has(sku))).toBe(true);
  });
});
