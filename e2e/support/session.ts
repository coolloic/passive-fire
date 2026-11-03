import { expect, type Page } from "@playwright/test";

/** Signs in as the SAMPLE team leader with the service worker in control, and waits for the offline save. */
export async function signInWithServiceWorker(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))))
    await page.reload();
  await expect(page.getByText("Saved 7 planned works for offline use")).toBeVisible();
}
