import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "@/lib/sample-data/site";
import { admin, anonClient, isoDate } from "./support";

const teamLeader = SAMPLE_PERSONAS.find((persona) => persona.role === "team_leader")!;
const projectManager = SAMPLE_PERSONAS.find((persona) => persona.role === "project_manager")!;

/** The passwordless demo sign-in task 4.1 will use: a server-generated magic link, verified. */
async function signInAsDemo(email: string): Promise<SupabaseClient> {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const client = anonClient();
  const verified = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.data.properties.hashed_token,
  });
  if (verified.error) throw verified.error;
  return client;
}

let leader: SupabaseClient;
let manager: SupabaseClient;

beforeAll(async () => {
  leader = await signInAsDemo(teamLeader.email);
  manager = await signInAsDemo(projectManager.email);
});

describe("demo personas", () => {
  it("sign in without a password and get their SAMPLE profiles", async () => {
    const { data } = await leader.from("profiles").select("display_name, role, is_sample").single();
    expect(data).toEqual({
      display_name: teamLeader.displayName,
      role: "team_leader",
      is_sample: true,
    });
  });

  it("cannot sign in with a guessed password", async () => {
    const { error } = await anonClient().auth.signInWithPassword({
      email: teamLeader.email,
      password: "password",
    });
    expect(error).not.toBeNull();
  });
});

describe("SAMPLE planned work", () => {
  it("is visible to the team leader across both crews, with dates relative to today", async () => {
    const { data } = await leader.from("planned_work").select("id, work_date").order("work_date");
    const byId = new Map((data ?? []).map((row) => [row.id, row.work_date]));
    for (const work of SAMPLE_PLANNED_WORK) {
      expect(byId.get(work.id)).toBe(isoDate(work.dayOffset));
    }
  });

  it("is visible to the project manager", async () => {
    const { count } = await manager
      .from("planned_work")
      .select("id", { count: "exact", head: true })
      .in(
        "id",
        SAMPLE_PLANNED_WORK.map((work) => work.id),
      );
    expect(count).toBe(SAMPLE_PLANNED_WORK.length);
  });

  it("feeds allocation demand for future work only", async () => {
    const { data } = await leader.rpc("allocation_demand", { from_date: isoDate(0) });
    const ids = new Set(
      (data ?? []).map((row: { planned_work_id: string }) => row.planned_work_id),
    );
    const past = SAMPLE_PLANNED_WORK.find((work) => work.expected === "past")!;
    expect(ids.has(past.id)).toBe(false);
    expect(ids.has(SAMPLE_PLANNED_WORK.find((work) => work.key === "PW1")!.id)).toBe(true);
  });

  it("gives PW1 a demand of 14 Ø50 collars", async () => {
    const pw1 = SAMPLE_PLANNED_WORK.find((work) => work.key === "PW1")!;
    const { data: products } = await leader
      .from("products")
      .select("id, sku")
      .eq("sku", "SAMPLE-COLLAR-050")
      .single();
    const { data } = await leader.rpc("allocation_demand", { from_date: isoDate(0) });
    const row = (data ?? []).find(
      (entry: { planned_work_id: string; product_id: string }) =>
        entry.planned_work_id === pw1.id && entry.product_id === products?.id,
    );
    expect(row?.quantity).toBe(14);
  });

  it("leaves the Ø65 collar without a stock record and one scenario without a nominated solution", async () => {
    const stock = await leader
      .from("stock")
      .select("product_id, products!inner(sku)")
      .eq("products.sku", "SAMPLE-COLLAR-065");
    const unnominated = await leader
      .from("scenarios")
      .select("id, nominated_solutions(scenario_id)")
      .like("label", "%not yet nominated%")
      .single();
    expect(stock.data).toEqual([]);
    expect(unnominated.data?.nominated_solutions).toBeNull();
  });

  it("has an overdue delivery and a delivery due on PW3's date", async () => {
    const { data } = await leader.from("expected_deliveries").select("expected_date, received_at");
    const dates = (data ?? []).map((row) => row.expected_date);
    expect(dates).toContain(isoDate(-2));
    expect(dates).toContain(isoDate(3));
    expect((data ?? []).every((row) => row.received_at === null)).toBe(true);
  });
});
