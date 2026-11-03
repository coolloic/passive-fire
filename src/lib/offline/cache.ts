import { logger } from "@/lib/logger";
import { LEGACY_PAGE_CACHES, OFFLINE_PAGES_CACHE } from "./routes";

/**
 * Deletes every cache that can hold private pages. Called on sign-in and sign-out so the next
 * person on the device never sees someone else's saved data (ADR 0003). Never throws.
 */
export async function clearPrivateCaches(
  storage: CacheStorage | undefined = globalThis.caches,
): Promise<void> {
  if (!storage) return;
  try {
    await Promise.all(
      [OFFLINE_PAGES_CACHE, ...LEGACY_PAGE_CACHES].map((name) => storage.delete(name)),
    );
  } catch (error) {
    logger.warn("Could not clear offline caches", { error: String(error) });
  }
}
