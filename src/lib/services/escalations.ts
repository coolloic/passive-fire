import { z } from "zod";
import {
  EscalationForbiddenError,
  type EscalationRepository,
} from "@/lib/data/escalation-repository";
import type { PlannedWorkDetailSource } from "@/lib/data/readiness-repository";
import type { IsoDate } from "@/lib/readiness/types";
import { getPlannedWorkDetail } from "./planned-work-detail";

export const NOTE_MAX_LENGTH = 1000;

const noteSchema = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, `Keep the note to ${NOTE_MAX_LENGTH} characters or fewer.`);

const raiseSchema = z.object({
  id: z.uuid(),
  plannedWorkId: z.uuid(),
  note: noteSchema.optional(),
});

const addNoteSchema = z.object({
  escalationId: z.uuid(),
  body: noteSchema.min(1, "Write a note before adding it."),
});

export type RaiseEscalationResult =
  | { kind: "created" | "duplicate" | "already_open"; escalationId: string }
  | { kind: "invalid"; message: string }
  | { kind: "not_found" };

export type AddNoteResult =
  { kind: "added" } | { kind: "invalid"; message: string } | { kind: "not_found" };

function firstIssue(error: z.ZodError): string {
  // Zod always reports at least one issue for a failed parse.
  return error.issues[0]!.message;
}

/**
 * Raises an escalation for a planned work. The shortage lines are recomputed on the server from
 * current readiness; nothing the client sends about shortages is trusted (spec FR-7).
 */
export async function raiseEscalation(
  deps: { readiness: PlannedWorkDetailSource; escalations: EscalationRepository },
  input: unknown,
  today: IsoDate,
): Promise<RaiseEscalationResult> {
  const parsed = raiseSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", message: firstIssue(parsed.error) };

  const detail = await getPlannedWorkDetail(deps.readiness, parsed.data.plannedWorkId, today);
  if (!detail) return { kind: "not_found" };

  try {
    const result = await deps.escalations.raise({
      id: parsed.data.id,
      plannedWorkId: parsed.data.plannedWorkId,
      lines: detail.escalationLines.map((preview) => preview.line),
      note: parsed.data.note ? parsed.data.note : null,
      // Raised offline and synced after the shortage cleared (spec AC-10.4).
      shortageCleared: detail.state === "ready",
    });
    return { kind: result.status, escalationId: result.escalationId };
  } catch (error) {
    if (error instanceof EscalationForbiddenError) return { kind: "not_found" };
    throw error;
  }
}

/** Adds a note to an escalation the user may see (spec AC-7.4). */
export async function addEscalationNote(
  escalations: EscalationRepository,
  input: unknown,
): Promise<AddNoteResult> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", message: firstIssue(parsed.error) };
  try {
    await escalations.addNote(parsed.data.escalationId, parsed.data.body);
    return { kind: "added" };
  } catch (error) {
    if (error instanceof EscalationForbiddenError) return { kind: "not_found" };
    throw error;
  }
}
