import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anonClient, createWorld, destroyWorld, isoDate, type World } from "./support";

const INSUFFICIENT_PRIVILEGE = "42501";
const UNIQUE_VIOLATION = "23505";

let world: World;

beforeAll(async () => {
  world = await createWorld();
});

afterAll(async () => {
  await destroyWorld(world);
});

async function raiseEscalation(plannedWorkId: string, id: string = randomUUID()) {
  const result = await world.leaderA.client
    .from("escalations")
    .insert({ id, planned_work_id: plannedWorkId })
    .select("id, state")
    .single();
  return { id, ...result };
}

describe("planned work visibility", () => {
  it("a team leader reads their own crews' planned work only", async () => {
    const { data, error } = await world.leaderA.client
      .from("planned_work")
      .select("id")
      .in("id", [world.plannedWorkA, world.plannedWorkB]);
    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([world.plannedWorkA]);
  });

  it("a team leader cannot read another crew's planned work items, site or scenarios", async () => {
    const client = world.leaderB.client;
    const items = await client
      .from("planned_work_items")
      .select("scenario_id")
      .eq("planned_work_id", world.plannedWorkA);
    const site = await client.from("sites").select("id").eq("id", world.siteA);
    const scenarios = await client.from("scenarios").select("id").eq("site_id", world.siteA);
    expect(items.data).toEqual([]);
    expect(site.data).toEqual([]);
    expect(scenarios.data).toEqual([]);
  });

  it("a project manager reads all planned work", async () => {
    const { data } = await world.projectManager.client
      .from("planned_work")
      .select("id")
      .in("id", [world.plannedWorkA, world.plannedWorkB]);
    expect(data?.map((row) => row.id).sort()).toEqual(
      [world.plannedWorkA, world.plannedWorkB].sort(),
    );
  });

  it("signed-out users read nothing", async () => {
    const { data, error } = await anonClient().from("planned_work").select("id");
    expect(data ?? []).toEqual([]);
    expect(error?.code ?? INSUFFICIENT_PRIVILEGE).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("allocation_demand", () => {
  it("returns every crew's demand, marking only the caller's own", async () => {
    const { data, error } = await world.leaderA.client.rpc("allocation_demand", {
      from_date: isoDate(0),
    });
    expect(error).toBeNull();
    const rows = (data ?? []).filter((row: { planned_work_id: string }) =>
      [world.plannedWorkA, world.plannedWorkB].includes(row.planned_work_id),
    );
    expect(rows).toHaveLength(2);
    const own = rows.find(
      (row: { planned_work_id: string }) => row.planned_work_id === world.plannedWorkA,
    );
    const other = rows.find(
      (row: { planned_work_id: string }) => row.planned_work_id === world.plannedWorkB,
    );
    expect(own).toMatchObject({ is_own: true, product_id: world.productId, quantity: 6 });
    expect(other).toMatchObject({ is_own: false, product_id: world.productId, quantity: 8 });
  });

  it("exposes no crew, site or scenario details", async () => {
    const { data } = await world.leaderB.client.rpc("allocation_demand", { from_date: isoDate(0) });
    const row = (data ?? [])[0];
    expect(Object.keys(row).sort()).toEqual(
      ["created_at", "is_own", "planned_work_id", "product_id", "quantity", "work_date"].sort(),
    );
  });

  it("excludes planned work before from_date", async () => {
    const { data } = await world.leaderA.client.rpc("allocation_demand", { from_date: isoDate(2) });
    const ids = (data ?? []).map((row: { planned_work_id: string }) => row.planned_work_id);
    expect(ids).not.toContain(world.plannedWorkA);
    expect(ids).toContain(world.plannedWorkB);
  });

  it("cannot be called by signed-out users", async () => {
    const { error } = await anonClient().rpc("allocation_demand", { from_date: isoDate(0) });
    expect(error).not.toBeNull();
  });
});

describe("escalations", () => {
  it("a team leader raises an escalation on their own crew's planned work", async () => {
    const { data, error } = await raiseEscalation(world.plannedWorkA);
    expect(error).toBeNull();
    expect(data?.state).toBe("open");
    await admin.from("escalations").delete().eq("planned_work_id", world.plannedWorkA);
  });

  it("a team leader cannot raise on another crew's planned work", async () => {
    const { error } = await raiseEscalation(world.plannedWorkB);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("a project manager cannot raise escalations", async () => {
    const { error } = await world.projectManager.client
      .from("escalations")
      .insert({ id: randomUUID(), planned_work_id: world.plannedWorkA });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("allows only one open escalation per planned work", async () => {
    const first = await raiseEscalation(world.plannedWorkA);
    expect(first.error).toBeNull();
    const second = await raiseEscalation(world.plannedWorkA);
    expect(second.error?.code).toBe(UNIQUE_VIOLATION);
    await admin.from("escalations").delete().eq("planned_work_id", world.plannedWorkA);
  });

  it("retrying an insert with the same id stores one escalation", async () => {
    const id = randomUUID();
    const row = { id, planned_work_id: world.plannedWorkA };
    const client = world.leaderA.client;
    await client.from("escalations").upsert(row, { onConflict: "id", ignoreDuplicates: true });
    const retry = await client
      .from("escalations")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true });
    expect(retry.error).toBeNull();
    const { count } = await admin
      .from("escalations")
      .select("id", { count: "exact", head: true })
      .eq("id", id);
    expect(count).toBe(1);
    await admin.from("escalations").delete().eq("id", id);
  });

  it("a team leader cannot resolve, and a project manager can", async () => {
    const { id } = await raiseEscalation(world.plannedWorkA);
    const resolution = {
      state: "resolved",
      resolution: "stock_arriving",
      resolved_at: new Date().toISOString(),
    };

    await world.leaderA.client
      .from("escalations")
      .update({ ...resolution, resolved_by: world.leaderA.id })
      .eq("id", id);
    const afterLeader = await admin.from("escalations").select("state").eq("id", id).single();
    expect(afterLeader.data?.state).toBe("open");

    const byManager = await world.projectManager.client
      .from("escalations")
      .update({ ...resolution, resolved_by: world.projectManager.id })
      .eq("id", id)
      .select("state, resolution")
      .single();
    expect(byManager.error).toBeNull();
    expect(byManager.data).toEqual({ state: "resolved", resolution: "stock_arriving" });

    const seenByLeader = await world.leaderA.client
      .from("escalations")
      .select("state, resolution")
      .eq("id", id)
      .single();
    expect(seenByLeader.data).toEqual({ state: "resolved", resolution: "stock_arriving" });
    await admin.from("escalations").delete().eq("id", id);
  });

  it("a project manager cannot record someone else as the resolver", async () => {
    const { id } = await raiseEscalation(world.plannedWorkA);
    const { error } = await world.projectManager.client
      .from("escalations")
      .update({
        state: "resolved",
        resolution: "planned_work_rescheduled",
        resolved_at: new Date().toISOString(),
        resolved_by: world.leaderA.id,
      })
      .eq("id", id);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    await admin.from("escalations").delete().eq("id", id);
  });

  it("another team leader cannot read, add lines to or add notes to the escalation", async () => {
    const { id } = await raiseEscalation(world.plannedWorkA);
    const other = world.leaderB.client;
    const read = await other.from("escalations").select("id").eq("id", id);
    const line = await other.from("escalation_lines").insert({
      escalation_id: id,
      product_id: world.productId,
      quantity_short: 1,
      reason: "shortage",
    });
    const note = await other
      .from("escalation_notes")
      .insert({ escalation_id: id, body: "Not mine" });
    expect(read.data).toEqual([]);
    expect(line.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(note.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    await admin.from("escalations").delete().eq("id", id);
  });

  it("the raiser and a project manager can add lines and notes", async () => {
    const { id } = await raiseEscalation(world.plannedWorkA);
    const line = await world.leaderA.client.from("escalation_lines").insert({
      escalation_id: id,
      product_id: world.productId,
      quantity_short: 2,
      reason: "shortage",
    });
    const leaderNote = await world.leaderA.client
      .from("escalation_notes")
      .insert({ escalation_id: id, body: "Need by Tuesday" });
    const managerNote = await world.projectManager.client
      .from("escalation_notes")
      .insert({ escalation_id: id, body: "Chasing the supplier" });
    expect(line.error).toBeNull();
    expect(leaderNote.error).toBeNull();
    expect(managerNote.error).toBeNull();
    const notes = await world.leaderA.client
      .from("escalation_notes")
      .select("body")
      .eq("escalation_id", id);
    expect(notes.data).toHaveLength(2);
    await admin.from("escalations").delete().eq("id", id);
  });
});

describe("profiles", () => {
  it("a team leader reads only their own profile; a project manager reads all", async () => {
    const leaderView = await world.leaderA.client
      .from("profiles")
      .select("id")
      .in("id", world.userIds);
    const managerView = await world.projectManager.client
      .from("profiles")
      .select("id")
      .in("id", world.userIds);
    expect(leaderView.data?.map((row) => row.id)).toEqual([world.leaderA.id]);
    expect(managerView.data).toHaveLength(3);
  });
});

describe("assistant usage", () => {
  it("allows messages up to the hourly limit, then reports when to retry", async () => {
    const client = world.leaderB.client;
    const first = await client.rpc("record_assistant_message", { max_per_hour: 2 });
    const second = await client.rpc("record_assistant_message", { max_per_hour: 2 });
    const third = await client.rpc("record_assistant_message", { max_per_hour: 2 });
    expect(first.data?.[0]).toMatchObject({ allowed: true, retry_at: null });
    expect(second.data?.[0]).toMatchObject({ allowed: true });
    expect(third.data?.[0].allowed).toBe(false);
    expect(new Date(third.data?.[0].retry_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("cannot be read or changed directly", async () => {
    const { error } = await world.leaderB.client.from("assistant_usage").select("*");
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
