import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders the app shell", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "QAntum Team Leader" })).toBeVisible();
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/sign-in");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
