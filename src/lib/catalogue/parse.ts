import { parseCsvRecords } from "./csv.ts";

export type SolutionShape = "round" | "rectangular" | "linear" | "unknown";

export type ParseFlag =
  | "size_unit_inferred"
  | "diameter_symbol_missing"
  | "single_dimension"
  | "length_unknown"
  | "size_unparsed"
  | "integrity_unparsed"
  | "insulation_unparsed"
  | "substrate_truncated"
  | "substrate_thickness_unknown";

/** One catalogue row: raw columns unchanged, plus cleaned fields. */
export interface CatalogueSolution {
  internalCode: string;
  supplierRefCode: string;
  supplier: string;
  orientation: string;
  substrateRaw: string;
  serviceClassification: string;
  serviceTypeRaw: string;
  serviceSizeRaw: string;
  integrityRaw: string;
  insulationRaw: string;
  serviceTypeOption: string;
  substrateOption: string;
  shape: SolutionShape;
  /** Round services. */
  diameterMm: number | null;
  /** Rectangular: width. Linear joints: the gap width. */
  widthMm: number | null;
  /** Rectangular: height. Linear joints: the joint length. */
  heightMm: number | null;
  substrateType: string | null;
  substrateThicknessMm: number | null;
  integrityMinutes: number | null;
  insulationMinutes: number | null;
  parseFlags: ParseFlag[];
}

const COLUMNS = {
  internalCode: "Internal Code",
  supplierRefCode: "Supplier Ref. Code",
  supplier: "Supplier",
  orientation: "Orientation",
  substrate: "Substrate",
  serviceClassification: "Service Classification",
  serviceType: "Service Type",
  serviceSize: "Service Size",
  integrity: "Integrity",
  insulation: "Insulation",
  serviceTypeOption: "Service Type Option",
  substrateOption: "Substrate Option",
} as const;

/** Largest dimension of a "Blank" opening that is treated as a linear joint (spec A-2). */
const LINEAR_JOINT_MAX_WIDTH_MM = 75;

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

interface ParsedSize {
  shape: SolutionShape;
  diameterMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  flags: ParseFlag[];
}

const unparsedSize: ParsedSize = {
  shape: "unknown",
  diameterMm: null,
  widthMm: null,
  heightMm: null,
  flags: ["size_unparsed"],
};

function isPipe(classification: string): boolean {
  return /pipe/i.test(classification);
}

/**
 * Parses the catalogue's size formats: `Ø50mm`, `75mm`, `60`, `1100x10mm`, `900mm x 50mm`, `75x1100mm`.
 * `isBlank` marks rows whose service type is "Blank" (linear joints or blank openings).
 */
export function parseServiceSize(
  raw: string,
  classification: string,
  isBlank: boolean,
): ParsedSize {
  const size = collapseWhitespace(raw);

  const round = /^Ø\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(size);
  if (round) {
    return {
      shape: "round",
      diameterMm: Number(round[1]),
      widthMm: null,
      heightMm: null,
      flags: [],
    };
  }

  const twoDimensions = /^(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(size);
  if (twoDimensions) {
    const first = Number(twoDimensions[1]);
    const second = Number(twoDimensions[2]);
    const narrow = Math.min(first, second);
    const wide = Math.max(first, second);
    if (isBlank && narrow <= LINEAR_JOINT_MAX_WIDTH_MM) {
      return { shape: "linear", diameterMm: null, widthMm: narrow, heightMm: wide, flags: [] };
    }
    return { shape: "rectangular", diameterMm: null, widthMm: first, heightMm: second, flags: [] };
  }

  const single = /^(\d+(?:\.\d+)?)\s*(mm)?$/i.exec(size);
  if (single) {
    const value = Number(single[1]);
    const unitFlags: ParseFlag[] = single[2] ? [] : ["size_unit_inferred"];
    if (isBlank) {
      return {
        shape: "linear",
        diameterMm: null,
        widthMm: value,
        heightMm: null,
        flags: [...unitFlags, "length_unknown"],
      };
    }
    if (isPipe(classification)) {
      return {
        shape: "round",
        diameterMm: value,
        widthMm: null,
        heightMm: null,
        flags: [...unitFlags, "diameter_symbol_missing"],
      };
    }
    return {
      shape: "rectangular",
      diameterMm: null,
      widthMm: value,
      heightMm: null,
      flags: [...unitFlags, "single_dimension"],
    };
  }

  return unparsedSize;
}

interface ParsedSubstrate {
  substrateType: string | null;
  substrateThicknessMm: number | null;
  flags: ParseFlag[];
}

/**
 * Splits "Concrete, 125mm concrete floor" into type and thickness.
 * Plasterboard linings use the board thickness: "(2 layers 13mm)" is 26 mm.
 */
export function parseSubstrate(raw: string): ParsedSubstrate {
  const value = collapseWhitespace(raw);
  const commaIndex = value.indexOf(",");
  const typePart = (commaIndex === -1 ? value : value.slice(0, commaIndex)).trim();
  const detail = commaIndex === -1 ? "" : value.slice(commaIndex + 1).trim();
  const substrateType =
    typePart === "" ? null : typePart.charAt(0).toUpperCase() + typePart.slice(1);

  if (detail === "") {
    return {
      substrateType,
      substrateThicknessMm: null,
      flags: ["substrate_truncated", "substrate_thickness_unknown"],
    };
  }

  const layers = /\(\s*(\d+)\s*layers?\s*(\d+(?:\.\d+)?)\s*mm\s*\)/i.exec(detail);
  if (layers) {
    return {
      substrateType,
      substrateThicknessMm: Number(layers[1]) * Number(layers[2]),
      flags: [],
    };
  }

  const bracketed = /\(\s*(\d+(?:\.\d+)?)\s*mm\s*\)/i.exec(detail);
  if (bracketed) {
    return { substrateType, substrateThicknessMm: Number(bracketed[1]), flags: [] };
  }

  // The last measurement describes the substrate: "75mm linear gap in 120mm concrete floor" is 120.
  const measurements = [...detail.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)];
  const last = measurements.at(-1);
  if (last) {
    return { substrateType, substrateThicknessMm: Number(last[1]), flags: [] };
  }

  return { substrateType, substrateThicknessMm: null, flags: ["substrate_thickness_unknown"] };
}

function parseMinutes(
  raw: string,
  emptyMarker: boolean,
): { minutes: number | null; valid: boolean } {
  const value = raw.trim();
  if (emptyMarker && value === "-") return { minutes: null, valid: true };
  if (/^\d+$/.test(value) && Number(value) > 0) return { minutes: Number(value), valid: true };
  return { minutes: null, valid: false };
}

function required(record: Record<string, string>, column: string): string {
  const value = record[column];
  if (value === undefined) {
    throw new Error(`Catalogue is missing the "${column}" column`);
  }
  return value;
}

export function normaliseSolution(record: Record<string, string>): CatalogueSolution {
  const read = (column: string) => required(record, column);
  const internalCode = read(COLUMNS.internalCode).trim();
  if (internalCode === "") {
    throw new Error("Catalogue row has an empty Internal Code");
  }

  const classification = read(COLUMNS.serviceClassification);
  const serviceType = read(COLUMNS.serviceType);
  const isBlank = collapseWhitespace(serviceType).toLowerCase() === "blank";
  const size = parseServiceSize(read(COLUMNS.serviceSize), classification, isBlank);
  const substrate = parseSubstrate(read(COLUMNS.substrate));
  const integrity = parseMinutes(read(COLUMNS.integrity), false);
  const insulation = parseMinutes(read(COLUMNS.insulation), true);

  const parseFlags: ParseFlag[] = [
    ...size.flags,
    ...(integrity.valid ? [] : (["integrity_unparsed"] as const)),
    ...(insulation.valid ? [] : (["insulation_unparsed"] as const)),
    ...substrate.flags,
  ];

  return {
    internalCode,
    supplierRefCode: read(COLUMNS.supplierRefCode),
    supplier: read(COLUMNS.supplier),
    orientation: read(COLUMNS.orientation),
    substrateRaw: read(COLUMNS.substrate),
    serviceClassification: classification,
    serviceTypeRaw: serviceType,
    serviceSizeRaw: read(COLUMNS.serviceSize),
    integrityRaw: read(COLUMNS.integrity),
    insulationRaw: read(COLUMNS.insulation),
    serviceTypeOption: read(COLUMNS.serviceTypeOption),
    substrateOption: read(COLUMNS.substrateOption),
    shape: size.shape,
    diameterMm: size.diameterMm,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    substrateType: substrate.substrateType,
    substrateThicknessMm: substrate.substrateThicknessMm,
    integrityMinutes: integrity.minutes,
    insulationMinutes: insulation.minutes,
    parseFlags,
  };
}

/** Parses the whole catalogue CSV. Duplicate internal codes are rejected. */
export function parseCatalogue(csvText: string): CatalogueSolution[] {
  const solutions = parseCsvRecords(csvText).map(normaliseSolution);
  const seen = new Set<string>();
  for (const solution of solutions) {
    if (seen.has(solution.internalCode)) {
      throw new Error(`Duplicate Internal Code ${solution.internalCode}`);
    }
    seen.add(solution.internalCode);
  }
  return solutions;
}
