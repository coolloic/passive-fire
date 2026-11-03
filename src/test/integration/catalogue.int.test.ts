import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createPersona, admin, type Persona } from "./support";

let reader: Persona;

beforeAll(async () => {
  reader = await createPersona("team_leader", "Catalogue reader");
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(reader.id);
});

describe("imported catalogue", () => {
  it("contains all 148 supplied solutions with leading zeros kept", async () => {
    const { data, error } = await reader.client
      .from("solutions")
      .select("internal_code")
      .like("internal_code", "0%");
    expect(error).toBeNull();
    expect(data).toHaveLength(148);
    expect(data?.map((row) => row.internal_code)).toContain("0334");
  });

  it("stores raw and cleaned fields side by side", async () => {
    const { data } = await reader.client
      .from("solutions")
      .select(
        "service_size_raw, shape, width_mm, height_mm, insulation_raw, insulation_minutes, parse_flags",
      )
      .eq("internal_code", "0789")
      .single();
    expect(data).toEqual({
      service_size_raw: "1100x10mm",
      shape: "linear",
      width_mm: 10,
      height_mm: 1100,
      insulation_raw: "60",
      insulation_minutes: 60,
      parse_flags: [],
    });
  });

  it("keeps flagged rows rather than dropping them", async () => {
    const { data } = await reader.client
      .from("solutions")
      .select("internal_code, parse_flags")
      .eq("internal_code", "0393")
      .single();
    expect(data?.parse_flags).toEqual(["size_unit_inferred", "diameter_symbol_missing"]);
  });

  it("is not readable by signed-out users", async () => {
    const { data } = await anonClient().from("solutions").select("internal_code").limit(1);
    expect(data ?? []).toEqual([]);
  });
});
