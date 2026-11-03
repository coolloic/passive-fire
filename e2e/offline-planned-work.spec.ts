import { expect, test, type Page } from "@playwright/test";
import { addDays, relativeDayLabel, todayIso } from "../src/lib/format/date";
import { resetEscalations } from "./support/database";

test.describe.configure({ mode: "serial" });

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);
const OFFLINE_CACHE = "team-leader-offline-pages";

async function signInWithServiceWorker(page: Page) {
  await page.goto("/sign-in");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
  // Make sure this page is controlled by the service worker, then let it save the details.
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))))
    await page.reload();
  await expect(page.getByText("Saved 7 planned works for offline use")).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await resetEscalations();
  await context.setOffline(false);
});

test.afterEach(async ({ context }) => {
  await context.setOffline(false);
});

test("planned work stays readable offline, including details never opened", async ({
  page,
  context,
}) => {
  await signInWithServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Planned work" })).toBeVisible();
  await expect(page.getByText(/You're offline\. Showing saved data from /)).toBeVisible();
  await expect(page.getByRole("region", { name: day(9) })).toContainText("Unknown");

  await page
    .getByRole("region", { name: day(9) })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/planned-work\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: "Scenarios" })).toContainText(
    "No solution nominated for this scenario",
  );
  const escalate = page.getByRole("button", { name: "Escalate" });
  await expect(escalate).toBeDisabled();
  await expect(
    page.getByText("Escalating needs a connection. Reconnect to escalate."),
  ).toBeVisible();
});

test("other private pages are never saved for offline use", async ({ page, context }) => {
  await signInWithServiceWorker(page);
  await page.getByRole("link", { name: "My escalations" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My escalations" })).toBeVisible();

  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto("/escalations");
  await expect(
    offlinePage.getByRole("heading", { level: 1, name: "You are offline" }),
  ).toBeVisible();
});

test("signing out removes saved planned work from the device", async ({ page }) => {
  await signInWithServiceWorker(page);
  expect(await page.evaluate((name) => caches.has(name), OFFLINE_CACHE)).toBe(true);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(await page.evaluate((name) => caches.has(name), OFFLINE_CACHE)).toBe(false);
});
