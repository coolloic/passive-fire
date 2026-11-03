import { describe, expect, it, vi } from "vitest";
import { clearPrivateCaches } from "./cache";

describe("clearPrivateCaches", () => {
  it("deletes the offline cache and legacy page caches", async () => {
    const storage = { delete: vi.fn(async () => true) } as unknown as CacheStorage;
    await clearPrivateCaches(storage);
    expect(vi.mocked(storage.delete).mock.calls.map(([name]) => name)).toEqual([
      "team-leader-offline-pages",
      "pages",
      "pages-rsc",
      "pages-rsc-prefetch",
      "others",
    ]);
  });

  it("does nothing when the Cache API is unavailable", async () => {
    await expect(clearPrivateCaches(undefined)).resolves.toBeUndefined();
  });

  it("swallows and logs failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = {
      delete: vi.fn(async () => Promise.reject(new Error("quota"))),
    } as unknown as CacheStorage;
    await expect(clearPrivateCaches(storage)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("uses the global Cache API by default", async () => {
    const original = globalThis.caches;
    const remove = vi.fn(async () => true);
    Object.defineProperty(globalThis, "caches", { value: { delete: remove }, configurable: true });
    await clearPrivateCaches();
    expect(remove).toHaveBeenCalledTimes(5);
    Object.defineProperty(globalThis, "caches", { value: original, configurable: true });
  });
});
