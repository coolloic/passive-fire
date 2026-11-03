import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DataAccessError } from "./readiness-repository";

export interface AssistantAllowance {
  allowed: boolean;
  /** When the user may ask again; null while allowed. */
  retryAt: string | null;
}

export interface AssistantUsageRepository {
  /** Counts one message for the signed-in user against the hourly limit. */
  recordMessage(maxPerHour: number): Promise<AssistantAllowance>;
}

const rowSchema = z
  .array(z.object({ allowed: z.boolean(), retry_at: z.string().nullable() }))
  .length(1);

/** Uses the `record_assistant_message` database function (the usage table itself is not readable). */
export function createSupabaseAssistantUsageRepository(
  client: SupabaseClient,
): AssistantUsageRepository {
  return {
    async recordMessage(maxPerHour) {
      const { data, error } = await client.rpc("record_assistant_message", {
        max_per_hour: maxPerHour,
      });
      if (error) throw new DataAccessError("assistant usage", error);
      const parsed = rowSchema.safeParse(data);
      if (!parsed.success) throw new DataAccessError("assistant usage", parsed.error);
      const [row] = parsed.data;
      return { allowed: row!.allowed, retryAt: row!.retry_at };
    },
  };
}
