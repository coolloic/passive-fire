import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EscalationLineDraft, EscalationLineReason } from "@/lib/escalation/lines";
import type { IsoDate } from "@/lib/readiness/types";
import { DataAccessError, type ProductUnit } from "./readiness-repository";

export type EscalationState = "open" | "resolved";
export type EscalationResolution =
  "stock_arriving" | "different_solution_nominated" | "planned_work_rescheduled";
export type RaiseStatus = "created" | "duplicate" | "already_open";

export interface RaiseEscalationInput {
  id: string;
  plannedWorkId: string;
  lines: readonly EscalationLineDraft[];
  note: string | null;
  shortageCleared: boolean;
}

export interface EscalationSummary {
  id: string;
  plannedWorkId: string;
  workDate: IsoDate;
  crewName: string;
  siteName: string;
  state: EscalationState;
  raisedAt: string;
  resolution: EscalationResolution | null;
  shortageClearedAtSync: boolean;
}

export interface EscalationLineRecord {
  productName: string | null;
  unit: ProductUnit | null;
  quantityShort: number | null;
  reason: EscalationLineReason;
}

export interface EscalationNoteRecord {
  id: string;
  body: string;
  createdAt: string;
  /** Null when the reader may not see the author's profile (another person's). */
  authorName: string | null;
}

export interface EscalationRecord extends EscalationSummary {
  resolutionComment: string | null;
  resolvedAt: string | null;
  lines: EscalationLineRecord[];
  notes: EscalationNoteRecord[];
}

export interface EscalationRepository {
  raise(input: RaiseEscalationInput): Promise<{ status: RaiseStatus; escalationId: string }>;
  listMine(): Promise<EscalationSummary[]>;
  get(id: string): Promise<EscalationRecord | null>;
  addNote(escalationId: string, body: string): Promise<void>;
}

export class EscalationForbiddenError extends Error {
  constructor() {
    super("Not allowed to change this escalation");
    this.name = "EscalationForbiddenError";
  }
}

const raiseRowSchema = z.object({
  status: z.enum(["created", "duplicate", "already_open"]),
  escalation_id: z.string(),
});

const summaryFields = {
  id: z.string(),
  planned_work_id: z.string(),
  state: z.enum(["open", "resolved"]),
  raised_at: z.string(),
  resolution: z
    .enum(["stock_arriving", "different_solution_nominated", "planned_work_rescheduled"])
    .nullable(),
  shortage_cleared_at_sync: z.boolean(),
  planned_work: z.object({
    work_date: z.string(),
    crews: z.object({ name: z.string() }),
    sites: z.object({ name: z.string() }),
  }),
};
const summaryRowSchema = z.object(summaryFields);
const recordRowSchema = z.object({
  ...summaryFields,
  resolution_comment: z.string().nullable(),
  resolved_at: z.string().nullable(),
  escalation_lines: z.array(
    z.object({
      quantity_short: z.coerce.number().nullable(),
      reason: z.enum([
        "shortage",
        "no_nominated_solution",
        "no_product_requirement",
        "no_stock_record",
      ]),
      products: z
        .object({ name: z.string(), unit: z.enum(["each", "cartridge", "metre"]) })
        .nullable(),
    }),
  ),
  escalation_notes: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      created_at: z.string(),
      profiles: z.object({ display_name: z.string() }).nullable(),
    }),
  ),
});

const SUMMARY_SELECT =
  "id, planned_work_id, state, raised_at, resolution, shortage_cleared_at_sync, " +
  "planned_work!inner(work_date, crews!inner(name), sites!inner(name))";
const RECORD_SELECT =
  `${SUMMARY_SELECT}, resolution_comment, resolved_at, ` +
  "escalation_lines(quantity_short, reason, products(name, unit)), " +
  "escalation_notes(id, body, created_at, profiles(display_name))";

const INSUFFICIENT_PRIVILEGE = "42501";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toSummary(row: z.infer<typeof summaryRowSchema>): EscalationSummary {
  return {
    id: row.id,
    plannedWorkId: row.planned_work_id,
    workDate: row.planned_work.work_date,
    crewName: row.planned_work.crews.name,
    siteName: row.planned_work.sites.name,
    state: row.state,
    raisedAt: row.raised_at,
    resolution: row.resolution,
    shortageClearedAtSync: row.shortage_cleared_at_sync,
  };
}

function parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new DataAccessError(operation, result.error);
  return result.data;
}

/** Supabase implementation, using the signed-in user's client so access rules apply. */
export function createSupabaseEscalationRepository(client: SupabaseClient): EscalationRepository {
  return {
    async raise(input) {
      const { data, error } = await client.rpc("raise_escalation", {
        p_id: input.id,
        p_planned_work_id: input.plannedWorkId,
        p_lines: input.lines.map((line) => ({
          product_id: line.productId,
          quantity_short: line.quantityShort,
          reason: line.reason,
        })),
        p_note: input.note,
        p_shortage_cleared: input.shortageCleared,
      });
      if (error?.code === INSUFFICIENT_PRIVILEGE) throw new EscalationForbiddenError();
      if (error) throw new DataAccessError("escalation", error);
      const [row] = parse(z.array(raiseRowSchema), data, "escalation");
      if (!row) throw new DataAccessError("escalation");
      return { status: row.status, escalationId: row.escalation_id };
    },

    async listMine() {
      const { data, error } = await client
        .from("escalations")
        .select(SUMMARY_SELECT)
        .order("raised_at", { ascending: false });
      if (error) throw new DataAccessError("escalations", error);
      return parse(z.array(summaryRowSchema), data, "escalations").map(toSummary);
    },

    async get(id) {
      if (!UUID.test(id)) return null;
      const { data, error } = await client
        .from("escalations")
        .select(RECORD_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new DataAccessError("escalation", error);
      if (data === null) return null;
      const row = parse(recordRowSchema, data, "escalation");
      return {
        ...toSummary(row),
        resolutionComment: row.resolution_comment,
        resolvedAt: row.resolved_at,
        lines: row.escalation_lines.map((line) => ({
          productName: line.products?.name ?? null,
          unit: line.products?.unit ?? null,
          quantityShort: line.quantity_short,
          reason: line.reason,
        })),
        notes: row.escalation_notes
          .map((note) => ({
            id: note.id,
            body: note.body,
            createdAt: note.created_at,
            authorName: note.profiles?.display_name ?? null,
          }))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      };
    },

    async addNote(escalationId, body) {
      const { error } = await client
        .from("escalation_notes")
        .insert({ escalation_id: escalationId, body });
      if (error?.code === INSUFFICIENT_PRIVILEGE) throw new EscalationForbiddenError();
      if (error) throw new DataAccessError("escalation note", error);
    },
  };
}
