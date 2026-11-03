import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createPersona, type Persona } from "./support";

let reader: Persona;

beforeAll(async () => {
  reader = await createPersona("team_leader", "Sample products reader");
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(reader.id);
});

describe("SAMPLE products and requirements", () => {
  it("loads the SAMPLE products, all labelled as sample", async () => {
    const { data, error } = await reader.client
      .from("products")
      .select("sku, is_sample")
      .like("sku", "SAMPLE-%");
    expect(error).toBeNull();
    expect(data).toHaveLength(9);
    expect(data?.every((product) => product.is_sample)).toBe(true);
  });

  it("gives a 100 mm copper pipe in a wall sealant and wrap", async () => {
    const { data } = await reader.client
      .from("product_requirements")
      .select(
        "quantity_per_penetration, is_sample, products!inner(sku), solutions!inner(internal_code)",
      )
      .eq("solutions.internal_code", "0345");
    const bySku = Object.fromEntries(
      (data ?? []).map((row) => [
        (row.products as unknown as { sku: string }).sku,
        row.quantity_per_penetration,
      ]),
    );
    expect(bySku).toEqual({ "SAMPLE-SEALANT-310": 0.4, "SAMPLE-WRAP-M": 0.5 });
    expect(data?.every((row) => row.is_sample)).toBe(true);
  });

  it("has no requirement for the structural timber beam", async () => {
    const { data } = await reader.client
      .from("product_requirements")
      .select("product_id, solutions!inner(internal_code)")
      .eq("solutions.internal_code", "0918");
    expect(data).toEqual([]);
  });
});
