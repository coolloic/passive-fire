import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseAssistantUsageRepository } from "./assistant-usage-repository";
import { DataAccessError } from "./readiness-repository";

const client = (result: { data: unknown; error: unknown }) => {
  const rpc = vi.fn(async () => result);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe("createSupabaseAssistantUsageRepository", () => {
  it("records a message and reports the allowance", async () => {
    const fake = client({ data: [{ allowed: true, retry_at: null }], error: null });
    await expect(
      createSupabaseAssistantUsageRepository(fake.client).recordMessage(20),
    ).resolves.toEqual({
      allowed: true,
      retryAt: null,
    });
    expect(fake.rpc).toHaveBeenCalledWith("record_assistant_message", { max_per_hour: 20 });
  });

  it("reports when the limit is reached", async () => {
    const fake = client({
      data: [{ allowed: false, retry_at: "2026-11-03T15:00:00Z" }],
      error: null,
    });
    await expect(
      createSupabaseAssistantUsageRepository(fake.client).recordMessage(20),
    ).resolves.toEqual({
      allowed: false,
      retryAt: "2026-11-03T15:00:00Z",
    });
  });

  it("wraps errors and malformed results", async () => {
    await expect(
      createSupabaseAssistantUsageRepository(
        client({ data: null, error: { message: "x" } }).client,
      ).recordMessage(20),
    ).rejects.toThrowError(DataAccessError);
    await expect(
      createSupabaseAssistantUsageRepository(
        client({ data: [], error: null }).client,
      ).recordMessage(20),
    ).rejects.toThrowError(DataAccessError);
  });
});
