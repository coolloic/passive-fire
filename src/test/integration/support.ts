import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

interface IntegrationEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function readEnv(): IntegrationEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(`Integration tests need: ${missing.join(", ")}. Run \`pnpm db:env\`.`);
  }
  return { url, anonKey, serviceRoleKey };
}

const env = readEnv();
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Service role client for TEST SETUP ONLY: creating users and fixture rows.
 * It bypasses RLS, so assertions must never use it. Application code never uses this key.
 */
export const admin: SupabaseClient = createClient(env.url, env.serviceRoleKey, noSession);

/** A client with no session: the anon role. */
export function anonClient(): SupabaseClient {
  return createClient(env.url, env.anonKey, noSession);
}

export interface Persona {
  id: string;
  client: SupabaseClient;
}

type Role = "team_leader" | "project_manager";

export async function createPersona(role: Role, displayName: string): Promise<Persona> {
  const email = `${role}-${randomUUID()}@test.local`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const id = created.data.user.id;

  const profile = await admin.from("profiles").insert({ id, display_name: displayName, role });
  if (profile.error) throw profile.error;

  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id, client };
}

async function insertOne<T extends Record<string, unknown>>(
  table: string,
  row: T,
): Promise<{ id: string }> {
  const { data, error } = await admin.from(table).insert(row).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

export function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export interface World {
  projectManager: Persona;
  leaderA: Persona;
  leaderB: Persona;
  siteA: string;
  siteB: string;
  scenarioA: string;
  plannedWorkA: string;
  plannedWorkB: string;
  productId: string;
  userIds: string[];
}

/** Two team leaders, each with a crew, site, scenario and planned work, plus a project manager. */
export async function createWorld(): Promise<World> {
  const tag = randomUUID().slice(0, 8);
  const projectManager = await createPersona("project_manager", `PM ${tag}`);
  const leaderA = await createPersona("team_leader", `Leader A ${tag}`);
  const leaderB = await createPersona("team_leader", `Leader B ${tag}`);

  const solution = await insertOne("solutions", {
    internal_code: `T${tag}`,
    supplier_ref_code: "TEST",
    supplier: "Test",
    orientation: "Wall",
    substrate_raw: "Test substrate",
    service_classification: "Combustible Pipe",
    service_type_raw: "PVC Pipe",
    service_size_raw: "Ø50mm",
    integrity_raw: "60",
    insulation_raw: "60",
    service_type_option: "PVC Pipe",
    substrate_option: "Plasterboard Wall",
  });
  const product = await insertOne("products", {
    sku: `SKU-${tag}`,
    name: "Test collar",
    unit: "each",
  });
  const requirement = await admin.from("product_requirements").insert({
    solution_id: solution.id,
    product_id: product.id,
    quantity_per_penetration: 2,
  });
  if (requirement.error) throw requirement.error;

  const siteA = await insertOne("sites", { name: `Site A ${tag}` });
  const siteB = await insertOne("sites", { name: `Site B ${tag}` });
  const scenarioDefaults = {
    label: "PVC 50 wall",
    service_type: "PVC Pipe",
    service_size: "Ø50mm",
    orientation: "Wall",
    substrate: "Plasterboard Wall",
  };
  const scenarioA = await insertOne("scenarios", { ...scenarioDefaults, site_id: siteA.id });
  const scenarioB = await insertOne("scenarios", { ...scenarioDefaults, site_id: siteB.id });
  const nominated = await admin.from("nominated_solutions").insert([
    { scenario_id: scenarioA.id, solution_id: solution.id },
    { scenario_id: scenarioB.id, solution_id: solution.id },
  ]);
  if (nominated.error) throw nominated.error;

  const crewA = await insertOne("crews", { name: `Crew A ${tag}`, team_leader_id: leaderA.id });
  const crewB = await insertOne("crews", { name: `Crew B ${tag}`, team_leader_id: leaderB.id });
  const plannedWorkA = await insertOne("planned_work", {
    crew_id: crewA.id,
    site_id: siteA.id,
    work_date: isoDate(1),
  });
  const plannedWorkB = await insertOne("planned_work", {
    crew_id: crewB.id,
    site_id: siteB.id,
    work_date: isoDate(2),
  });
  const items = await admin.from("planned_work_items").insert([
    { planned_work_id: plannedWorkA.id, scenario_id: scenarioA.id, penetration_count: 3 },
    { planned_work_id: plannedWorkB.id, scenario_id: scenarioB.id, penetration_count: 4 },
  ]);
  if (items.error) throw items.error;

  return {
    projectManager,
    leaderA,
    leaderB,
    siteA: siteA.id,
    siteB: siteB.id,
    scenarioA: scenarioA.id,
    plannedWorkA: plannedWorkA.id,
    plannedWorkB: plannedWorkB.id,
    productId: product.id,
    userIds: [projectManager.id, leaderA.id, leaderB.id],
  };
}

/** Removes the world's users; planned work, escalations and notes cascade via crews and profiles. */
export async function destroyWorld(world: World): Promise<void> {
  await admin
    .from("escalations")
    .delete()
    .in("planned_work_id", [world.plannedWorkA, world.plannedWorkB]);
  await admin.from("crews").delete().in("team_leader_id", world.userIds);
  await admin.from("sites").delete().in("id", [world.siteA, world.siteB]);
  for (const id of world.userIds) {
    await admin.auth.admin.deleteUser(id);
  }
}
