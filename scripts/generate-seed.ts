// Generates supabase/seed/*.sql from the supplied catalogue (and, in later tasks, SAMPLE data).
// Run with `pnpm db:seed:generate`, then `pnpm db:reset` to load it.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseCatalogue } from "../src/lib/catalogue/parse.ts";
import { renderCatalogueSql } from "../src/lib/catalogue/seed-sql.ts";

export const CATALOGUE_CSV = "docs/solutions-excerpt.csv";
export const CATALOGUE_SEED = "supabase/seed/01_catalogue.sql";

export function generateCatalogueSeed(csvText: string): string {
  return renderCatalogueSql(parseCatalogue(csvText));
}

function main(): void {
  const sql = generateCatalogueSeed(readFileSync(CATALOGUE_CSV, "utf8"));
  mkdirSync("supabase/seed", { recursive: true });
  writeFileSync(CATALOGUE_SEED, sql);
  console.info(`Wrote ${CATALOGUE_SEED}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
