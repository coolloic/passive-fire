import { describe, expect, it, vi } from "vitest";
import { MAX_DRAFT_TOKENS, draftEscalationNote, type DraftClient } from "./draft";

const facts = {
  date: "Fri 6 Nov",
  crew: "Crew Alpha",
  site: "Harbour View",
  lines: ["Short by 10 × Collar"],
};
const reply = (content: { type: string; text?: string }[], stop_reason = "end_turn") =>
  vi.fn(async () => ({ content, stop_reason })) as unknown as DraftClient &
    ReturnType<typeof vi.fn>;

describe("draftEscalationNote", () => {
  it("returns the drafted text, trimmed, from the facts it was given", async () => {
    const create = reply([
      { type: "thinking" },
      { type: "text", text: "  Crew Alpha is short " },
      { type: "text", text: "by 10 collars.  " },
    ]);
    await expect(draftEscalationNote(create, facts)).resolves.toEqual({
      kind: "ok",
      draft: "Crew Alpha is short by 10 collars.",
    });
    const params = (create.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: MAX_DRAFT_TOKENS,
      output_config: { effort: "low" },
      fallbacks: "default",
    });
    expect(String(params.system)).toContain("Do not suggest that another solution is compliant");
    expect(JSON.stringify(params.messages)).toContain("Short by 10 × Collar");
  });

  it("reports a refusal", async () => {
    await expect(draftEscalationNote(reply([], "refusal"), facts)).resolves.toEqual({
      kind: "refused",
    });
  });

  it("reports an empty draft", async () => {
    await expect(
      draftEscalationNote(reply([{ type: "text", text: "   " }]), facts),
    ).resolves.toEqual({ kind: "empty" });
  });
});
