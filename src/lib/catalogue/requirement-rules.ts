// SAMPLE product requirement rules (spec §4). The catalogue has no products, so quantities per
// penetration are derived from service, size, orientation and rating. A solution with no matching
// rule gets no requirement, and readiness reports it as Unknown.
import type { CatalogueSolution } from "./parse.ts";
import {
  BACKING_ROD_SKU,
  COLLAR_BANDS_MM,
  FIRE_BATT_SKU,
  PIPE_WRAP_SKU,
  SEALANT_SKU,
  collarSku,
} from "./sample-products.ts";

export interface ProductRequirementRow {
  internalCode: string;
  sku: string;
  quantityPerPenetration: number;
}

type RequirementSource = Pick<
  CatalogueSolution,
  | "internalCode"
  | "serviceClassification"
  | "serviceTypeRaw"
  | "orientation"
  | "shape"
  | "diameterMm"
  | "widthMm"
  | "heightMm"
  | "insulationMinutes"
>;

/** Area one fire batt covers, in m² (1200 × 600 mm). */
export const BATT_AREA_M2 = 0.72;
const SEALANT_PER_25MM = 0.1;
const SEALANT_FOR_OPENING = 0.5;
const SEALANT_FOR_COLLAR = 0.1;
const SEALANT_PER_10MM_PER_METRE = 0.1;
const WRAP_METRES = 0.5;
const WRAP_INSULATION_THRESHOLD_MINUTES = 60;

/** Rounds to the 3 decimal places stored in the database, avoiding floating-point noise. */
export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Walls are fire-stopped on both faces; floors and ceilings on one. */
export function exposedFaces(orientation: string): number {
  return orientation.trim().toLowerCase() === "wall" ? 2 : 1;
}

export function collarBand(diameterMm: number): number | null {
  return COLLAR_BANDS_MM.find((band) => band >= diameterMm) ?? null;
}

/** 0.1 cartridge per 25 mm of diameter, rounded up to the next 25 mm. */
export function sealantForDiameter(diameterMm: number): number {
  return roundQuantity(Math.ceil(diameterMm / 25) * SEALANT_PER_25MM);
}

export function battsForOpening(widthMm: number, heightMm: number, orientation: string): number {
  const areaM2 = (widthMm / 1000) * (heightMm / 1000);
  return Math.ceil(areaM2 / BATT_AREA_M2) * exposedFaces(orientation);
}

function row(source: RequirementSource, sku: string, quantity: number): ProductRequirementRow {
  return {
    internalCode: source.internalCode,
    sku,
    quantityPerPenetration: roundQuantity(quantity),
  };
}

function combustiblePipe(source: RequirementSource): ProductRequirementRow[] {
  if (source.diameterMm === null) return [];
  const band = collarBand(source.diameterMm);
  if (band === null) return [];
  return [
    row(source, collarSku(band), exposedFaces(source.orientation)),
    row(source, SEALANT_SKU, SEALANT_FOR_COLLAR),
  ];
}

function nonCombustiblePipe(source: RequirementSource): ProductRequirementRow[] {
  if (source.diameterMm === null) return [];
  const rows = [row(source, SEALANT_SKU, sealantForDiameter(source.diameterMm))];
  if ((source.insulationMinutes ?? 0) >= WRAP_INSULATION_THRESHOLD_MINUTES) {
    rows.push(row(source, PIPE_WRAP_SKU, WRAP_METRES));
  }
  return rows;
}

function insulatedPipe(source: RequirementSource): ProductRequirementRow[] {
  if (source.diameterMm === null) return [];
  return [
    row(source, PIPE_WRAP_SKU, WRAP_METRES),
    row(source, SEALANT_SKU, sealantForDiameter(source.diameterMm)),
  ];
}

function opening(source: RequirementSource): ProductRequirementRow[] {
  if (source.widthMm === null || source.heightMm === null) return [];
  return [
    row(
      source,
      FIRE_BATT_SKU,
      battsForOpening(source.widthMm, source.heightMm, source.orientation),
    ),
    row(source, SEALANT_SKU, SEALANT_FOR_OPENING),
  ];
}

function electrical(source: RequirementSource): ProductRequirementRow[] {
  if (/tray/i.test(source.serviceTypeRaw)) {
    return source.shape === "rectangular" ? opening(source) : [];
  }
  if (source.diameterMm === null) return [];
  return [row(source, SEALANT_SKU, sealantForDiameter(source.diameterMm))];
}

function blank(source: RequirementSource): ProductRequirementRow[] {
  if (source.shape === "rectangular") return opening(source);
  if (source.shape !== "linear" || source.widthMm === null || source.heightMm === null) return [];
  const lengthM = source.heightMm / 1000;
  return [
    row(source, BACKING_ROD_SKU, lengthM),
    row(source, SEALANT_SKU, (source.widthMm / 10) * SEALANT_PER_10MM_PER_METRE * lengthM),
  ];
}

/** Product requirements per penetration for one solution; empty when no rule applies. */
export function requirementsFor(source: RequirementSource): ProductRequirementRow[] {
  switch (source.serviceClassification.trim()) {
    case "Combustible Pipe":
      return combustiblePipe(source);
    case "Non-Combustible Pipe":
      return nonCombustiblePipe(source);
    case "Insulated Pipe":
      return insulatedPipe(source);
    case "Electrical Penetration":
      return electrical(source);
    case "Other":
      return /blank/i.test(source.serviceTypeRaw) ? blank(source) : [];
    default:
      return [];
  }
}
