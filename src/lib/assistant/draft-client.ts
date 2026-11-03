export const DRAFT_ENDPOINT = "/api/assistant/draft";

export type DraftOutcome =
  | { kind: "ok"; draft: string }
  | { kind: "not_configured" }
  | { kind: "disabled" }
  | { kind: "rate_limited"; retryAt: string | null }
  | { kind: "no_draft" }
  | { kind: "error" };

/** Asks the server for a draft escalation note. Never throws. */
export async function requestDraft(
  plannedWorkId: string,
  fetcher: typeof fetch = fetch,
): Promise<DraftOutcome> {
  let response: Response;
  let body: Record<string, unknown> | null = null;
  try {
    response = await fetcher(DRAFT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plannedWorkId }),
    });
    const parsed: unknown = await response.json();
    if (parsed !== null && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    return { kind: "error" };
  }
  if (response.ok && typeof body?.draft === "string") return { kind: "ok", draft: body.draft };
  if (response.status === 503)
    return { kind: body?.error === "disabled" ? "disabled" : "not_configured" };
  if (response.status === 429) {
    return {
      kind: "rate_limited",
      retryAt: typeof body?.retryAt === "string" ? body.retryAt : null,
    };
  }
  if (response.status === 422) return { kind: "no_draft" };
  return { kind: "error" };
}
