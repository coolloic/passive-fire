// Generates supabase/seed/*.sql from the supplied catalogue and SAMPLE data.
// Run with `pnpm db:seed:generate`, then `pnpm db:reset` to load it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseCatalogue } from "../src/lib/catalogue/parse.ts";
import { requirementsFor } from "../src/lib/catalogue/requirement-rules.ts";
import { SAMPLE_PRODUCTS } from "../src/lib/catalogue/sample-products.ts";
import { renderCatalogueSql, renderSampleProductsSql } from "../src/lib/catalogue/seed-sql.ts";

const CATALOGUE_CSV = "docs/solutions-excerpt.csv";
const SEED_FILES = {
  catalogue: "supabase/seed/01_catalogue.sql",
  sampleProducts: "supabase/seed/02_sample_products.sql",
};

function main(): void {
  const solutions = parseCatalogue(readFileSync(CATALOGUE_CSV, "utf8"));
  const requirements = solutions.flatMap(requirementsFor);
  mkdirSync("supabase/seed", { recursive: true });
  writeFileSync(SEED_FILES.catalogue, renderCatalogueSql(solutions));
  writeFileSync(SEED_FILES.sampleProducts, renderSampleProductsSql(SAMPLE_PRODUCTS, requirements));
  console.info(`Wrote ${Object.values(SEED_FILES).join(", ")}`);
}

main();
