import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { formatWorkDate, todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { getPlannedWorkDetail } from "@/lib/services/planned-work-detail";
import { draftEscalationNote, type DraftClient } from "./draft";
import { checkAssistantAccess, checkAssistantAllowance, jsonResponse } from "./guard";

const requestSchema = z.object({ plannedWorkId: z.uuid() });

/** Builds the SDK call used for drafts. */
export function createDraftClient(apiKey: string): DraftClient {
  const client = new Anthropic({ apiKey });
  return (params) => client.beta.messages.create(params);
}

/**
 * Drafts an escalation note for one planned work from facts computed on the server. Returns
 * `{ draft }`; the team leader edits and sends it themselves (spec FR-12).
 */
export async function handleDraftRequest(
  request: Request,
  clientFactory: (apiKey: string) => DraftClient = createDraftClient,
): Promise<Response> {
  const checked = await checkAssistantAccess();
  if ("denied" in checked) return checked.denied;
  const { access } = checked;

  let plannedWorkId: string;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return jsonResponse(400, { error: "invalid_request" });
    plannedWorkId = parsed.data.plannedWorkId;
  } catch {
    return jsonResponse(400, { error: "invalid_request" });
  }

  try {
    const detail = await getPlannedWorkDetail(
      createSupabaseReadinessDataSource(access.client),
      plannedWorkId,
      todayIso(),
    );
    if (!detail) return jsonResponse(404, { error: "not_found" });

    const limited = await checkAssistantAllowance(access);
    if (limited) return limited;

    const result = await draftEscalationNote(clientFactory(access.apiKey), {
      date: formatWorkDate(detail.workDate),
      crew: detail.crewName,
      site: detail.siteName,
      lines: detail.escalationLines.map((line) => line.description),
    });
    if (result.kind === "ok") return jsonResponse(200, { draft: result.draft });
    return jsonResponse(422, { error: result.kind });
  } catch (error) {
    logger.error("Could not draft escalation", error, { userId: access.user.id });
    return jsonResponse(500, { error: "unavailable" });
  }
}
