import { clearPrivateCaches } from "@/lib/offline/cache";
import { resetAssistant } from "@/stores/assistant-store";

/**
 * Removes everything private this browser holds for the signed-in user: pages saved for offline
 * use and the assistant conversation. Called on sign-in and sign-out, so the next person on the
 * device never sees it. Never throws.
 */
export async function clearPrivateData(
  clearCaches: () => Promise<void> = clearPrivateCaches,
): Promise<void> {
  resetAssistant();
  await clearCaches();
}
