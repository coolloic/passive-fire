"use server";

import { revalidatePath } from "next/cache";
import type {
  RaiseEscalationOutcome,
  RaiseEscalationRequest,
} from "@/components/organisms/EscalationForm";
import type { AddNoteOutcome } from "@/components/organisms/NoteForm";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseEscalationRepository } from "@/lib/data/escalation-repository";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { addEscalationNote, raiseEscalation } from "@/lib/services/escalations";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

/** Raises an escalation. Only team leaders; everything else is checked again on the server. */
export async function raiseEscalationAction(
  request: RaiseEscalationRequest,
): Promise<RaiseEscalationOutcome> {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "team_leader") return { kind: "not_found" };
    const client = createServerSupabaseClient();
    const result = await raiseEscalation(
      {
        readiness: createSupabaseReadinessDataSource(client),
        escalations: createSupabaseEscalationRepository(client),
      },
      request,
      todayIso(),
    );
    if (result.kind === "created") {
      revalidatePath("/planned-work", "layout");
      revalidatePath("/escalations");
    }
    return result;
  } catch (error) {
    logger.error("Could not raise escalation", error);
    return { kind: "error" };
  }
}

/** Adds a note to an escalation the signed-in user may see. */
export async function addNoteAction(request: {
  escalationId: string;
  body: string;
}): Promise<AddNoteOutcome> {
  try {
    if (!(await getCurrentUser())) return { kind: "not_found" };
    const result = await addEscalationNote(
      createSupabaseEscalationRepository(createServerSupabaseClient()),
      request,
    );
    if (result.kind === "added") revalidatePath(`/escalations/${request.escalationId}`);
    return result;
  } catch (error) {
    logger.error("Could not add escalation note", error);
    return { kind: "error" };
  }
}
