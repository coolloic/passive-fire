import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseAssistantUsageRepository } from "@/lib/data/assistant-usage-repository";
import { admin, createPersona, type Persona } from "./support";

let leader: Persona;

beforeAll(async () => {
  leader = await createPersona("team_leader", "Assistant user");
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(leader.id);
});

describe("assistant usage repository", () => {
  it("allows messages up to the limit, then gives a retry time within the hour", async () => {
    const usage = createSupabaseAssistantUsageRepository(leader.client);
    await expect(usage.recordMessage(1)).resolves.toEqual({ allowed: true, retryAt: null });
    const blocked = await usage.recordMessage(1);
    expect(blocked.allowed).toBe(false);
    const retry = new Date(blocked.retryAt!).getTime();
    expect(retry).toBeGreaterThan(Date.now());
    expect(retry - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});
