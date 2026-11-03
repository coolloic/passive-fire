import { describe, expect, it, vi } from "vitest";
import { useAssistantStore } from "@/stores/assistant-store";
import { clearPrivateData } from "./clear-private-data";

describe("clearPrivateData", () => {
  it("forgets the assistant conversation and clears saved pages", async () => {
    useAssistantStore.setState({ history: [{ role: "user", content: "Private" }], open: true });
    const clearCaches = vi.fn(async () => {});
    await clearPrivateData(clearCaches);
    expect(useAssistantStore.getState()).toMatchObject({ history: [], open: false });
    expect(clearCaches).toHaveBeenCalledOnce();
  });

  it("uses the offline cache clearing by default", async () => {
    // jsdom has no CacheStorage, which the cache helper treats as nothing to clear.
    await expect(clearPrivateData()).resolves.toBeUndefined();
  });
});
