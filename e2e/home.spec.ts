import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders the app shell", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "QAntum Team Leader" })).toBeVisible();
  });

  test("sends security headers that block framing and MIME sniffing", async ({ request }) => {
    const headers = (await request.get("/sign-in")).headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/sign-in");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
