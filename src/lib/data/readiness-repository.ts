import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { OwnPlannedWorkInput } from "@/lib/readiness/compute";
import { demandFromRows } from "@/lib/readiness/demand";
import type { ScenarioInput } from "@/lib/readiness/readiness";
import type { DemandLine, IsoDate, Supply } from "@/lib/readiness/types";

export interface ScenarioRecord extends ScenarioInput {
  label: string;
  /** Internal code of the nominated solution, e.g. "0798", or null when none is nominated. */
  solutionCode: string | null;
}

/** The user's planned work with the labels the UI needs. */
export interface PlannedWorkRecord extends OwnPlannedWorkInput {
  crewName: string;
  siteName: string;
  scenarios: ScenarioRecord[];
}

export type ProductUnit = "each" | "cartridge" | "metre";

export interface ProductRecord {
  id: string;
  name: string;
  unit: ProductUnit;
}

/** Everything readiness needs, through one interface so services and pages can be tested. */
export interface ReadinessDataSource {
  listOwnPlannedWork(from: IsoDate, to: IsoDate): Promise<PlannedWorkRecord[]>;
  getAllocationDemand(from: IsoDate): Promise<DemandLine[]>;
  getSupply(): Promise<Supply>;
}

/** Extra lookups for the Planned Work detail page. */
export interface PlannedWorkDetailSource extends ReadinessDataSource {
  /** One planned work, or null when it does not exist or the user cannot see it. */
  getPlannedWork(id: string): Promise<PlannedWorkRecord | null>;
  getProducts(ids: readonly string[]): Promise<ProductRecord[]>;
  getOpenEscalationId(plannedWorkId: string): Promise<string | null>;
}

export class DataAccessError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Could not load ${operation}`);
    this.name = "DataAccessError";
    this.cause = cause;
  }
}

// Response schemas. PostgREST returns to-one relations as objects and to-many as arrays.
const requirementSchema = z.object({
  product_id: z.string(),
  quantity_per_penetration: z.coerce.number(),
});
const plannedWorkRowSchema = z.object({
  id: z.string(),
  work_date: z.string(),
  created_at: z.string(),
  crews: z.object({ name: z.string() }),
  sites: z.object({ name: z.string() }),
  planned_work_items: z.array(
    z.object({
      penetration_count: z.number(),
      scenarios: z.object({
        id: z.string(),
        label: z.string(),
        nominated_solutions: z
          .object({
            solution_id: z.string(),
            solutions: z.object({
              internal_code: z.string(),
              product_requirements: z.array(requirementSchema),
            }),
          })
          .nullable(),
      }),
    }),
  ),
});
const demandRowSchema = z.object({
  planned_work_id: z.string(),
  work_date: z.string(),
  created_at: z.string(),
  product_id: z.string(),
  quantity: z.coerce.number(),
  is_own: z.boolean(),
});
const stockRowSchema = z.object({ product_id: z.string(), quantity: z.number() });
const deliveryRowSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  quantity: z.number(),
  expected_date: z.string(),
  received_at: z.string().nullable(),
});
const productRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["each", "cartridge", "metre"]),
});
const escalationRowSchema = z.object({ id: z.string() });

type PlannedWorkRow = z.infer<typeof plannedWorkRowSchema>;

export const PLANNED_WORK_SELECT =
  "id, work_date, created_at, crews!inner(name), sites!inner(name), " +
  "planned_work_items(penetration_count, scenarios!inner(id, label, nominated_solutions(solution_id, " +
  "solutions!inner(internal_code, product_requirements(product_id, quantity_per_penetration)))))";

export function toPlannedWorkRecord(row: PlannedWorkRow): PlannedWorkRecord {
  return {
    plannedWorkId: row.id,
    workDate: row.work_date,
    createdAt: row.created_at,
    crewName: row.crews.name,
    siteName: row.sites.name,
    scenarios: row.planned_work_items.map((item) => {
      const nominated = item.scenarios.nominated_solutions;
      return {
        scenarioId: item.scenarios.id,
        label: item.scenarios.label,
        penetrationCount: item.penetration_count,
        nominatedSolutionId: nominated?.solution_id ?? null,
        solutionCode: nominated?.solutions.internal_code ?? null,
        requirements: (nominated?.solutions.product_requirements ?? []).map((requirement) => ({
          productId: requirement.product_id,
          quantityPerPenetration: requirement.quantity_per_penetration,
        })),
      };
    }),
  };
}

function parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new DataAccessError(operation, result.error);
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supabase implementation. Uses the signed-in user's client, so access rules apply. */
export function createSupabaseReadinessDataSource(client: SupabaseClient): PlannedWorkDetailSource {
  return {
    async listOwnPlannedWork(from, to) {
      const { data, error } = await client
        .from("planned_work")
        .select(PLANNED_WORK_SELECT)
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date")
        .order("created_at");
      if (error) throw new DataAccessError("planned work", error);
      return parse(z.array(plannedWorkRowSchema), data, "planned work").map(toPlannedWorkRecord);
    },

    async getPlannedWork(id) {
      // Not a UUID: it cannot exist, and Postgres would reject the comparison.
      if (!UUID.test(id)) return null;
      const { data, error } = await client
        .from("planned_work")
        .select(PLANNED_WORK_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new DataAccessError("planned work", error);
      return data === null
        ? null
        : toPlannedWorkRecord(parse(plannedWorkRowSchema, data, "planned work"));
    },

    async getAllocationDemand(from) {
      const { data, error } = await client.rpc("allocation_demand", { from_date: from });
      if (error) throw new DataAccessError("allocation demand", error);
      return demandFromRows(parse(z.array(demandRowSchema), data, "allocation demand"));
    },

    async getSupply() {
      const [stock, deliveries] = await Promise.all([
        client.from("stock").select("product_id, quantity"),
        client
          .from("expected_deliveries")
          .select("id, product_id, quantity, expected_date, received_at"),
      ]);
      if (stock.error) throw new DataAccessError("stock", stock.error);
      if (deliveries.error) throw new DataAccessError("expected deliveries", deliveries.error);
      const stockRows = parse(z.array(stockRowSchema), stock.data, "stock");
      const deliveryRows = parse(
        z.array(deliveryRowSchema),
        deliveries.data,
        "expected deliveries",
      );
      return {
        stock: new Map(stockRows.map((row) => [row.product_id, row.quantity])),
        deliveries: deliveryRows.map((row) => ({
          id: row.id,
          productId: row.product_id,
          quantity: row.quantity,
          expectedDate: row.expected_date,
          received: row.received_at !== null,
        })),
      };
    },

    async getProducts(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await client
        .from("products")
        .select("id, name, unit")
        .in("id", [...ids]);
      if (error) throw new DataAccessError("products", error);
      return parse(z.array(productRowSchema), data, "products");
    },

    async getOpenEscalationId(plannedWorkId) {
      const { data, error } = await client
        .from("escalations")
        .select("id")
        .eq("planned_work_id", plannedWorkId)
        .eq("state", "open")
        .maybeSingle();
      if (error) throw new DataAccessError("escalations", error);
      return data === null ? null : parse(escalationRowSchema, data, "escalations").id;
    },
  };
}
