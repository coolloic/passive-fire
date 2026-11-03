import { expect, test } from "@playwright/test";

test.describe("progressive web app", () => {
  // Restore connectivity so context teardown is not blocked by an offline service worker.
  test.afterEach(async ({ context }) => {
    await context.setOffline(false);
  });

  test("serves an installable manifest", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512" }),
        expect.objectContaining({ purpose: "maskable" }),
      ]),
    );
  });

  test("shows an offline indicator when connectivity drops", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toHaveCount(0);

    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText(/you are offline/i);

    await context.setOffline(false);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("loads offline after the first visit", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Reload once under service worker control so the page is cached at runtime.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "QAntum Team Leader" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/you are offline/i);
  });

  test("falls back to the offline page for uncached routes", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();

    await context.setOffline(true);
    // Chromium does not complete an offline re-navigation of an existing tab under Playwright,
    // so open the uncached route in a fresh tab controlled by the same service worker.
    const offlinePage = await context.newPage();
    await offlinePage.goto("/never-visited");
    await expect(
      offlinePage.getByRole("heading", { level: 1, name: "You are offline" }),
    ).toBeVisible();
  });
});
