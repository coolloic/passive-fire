// SAMPLE products. Generic names, deliberately not real Ryanfire products (spec assumption A-6).

export type ProductUnit = "each" | "cartridge" | "metre";

export interface SampleProduct {
  sku: string;
  name: string;
  unit: ProductUnit;
}

/** Intumescent collar bands in mm; a pipe takes the smallest band at or above its diameter. */
export const COLLAR_BANDS_MM = [32, 50, 65, 100, 150] as const;

export function collarSku(bandMm: number): string {
  return `SAMPLE-COLLAR-${String(bandMm).padStart(3, "0")}`;
}

export const SEALANT_SKU = "SAMPLE-SEALANT-310";
export const PIPE_WRAP_SKU = "SAMPLE-WRAP-M";
export const FIRE_BATT_SKU = "SAMPLE-BATT-1200x600x50";
export const BACKING_ROD_SKU = "SAMPLE-ROD-M";

export const SAMPLE_PRODUCTS: readonly SampleProduct[] = [
  ...COLLAR_BANDS_MM.map((band) => ({
    sku: collarSku(band),
    name: `Intumescent pipe collar ${band} mm (SAMPLE)`,
    unit: "each" as const,
  })),
  { sku: SEALANT_SKU, name: "Fire-rated acrylic sealant 310 ml (SAMPLE)", unit: "cartridge" },
  { sku: PIPE_WRAP_SKU, name: "Intumescent pipe wrap (SAMPLE)", unit: "metre" },
  { sku: FIRE_BATT_SKU, name: "Fire batt 1200 × 600 × 50 mm (SAMPLE)", unit: "each" },
  { sku: BACKING_ROD_SKU, name: "Backing rod (SAMPLE)", unit: "metre" },
];
