import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
});

test("the main navigation stays in view at the end of a long page", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Planned work" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(nav).toBeInViewport();
  // Nothing in the page is hidden behind the bar on phones.
  await expect(page.getByText(/Saved \d+ planned works? for offline use/)).toBeInViewport();

  await nav.getByRole("link", { name: "My escalations" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My escalations" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "My escalations" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nav.getByRole("button", { name: "Assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant" });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByLabel("Your question")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(assistant).toBeHidden();
});

test("my escalations is marked as needing a connection while offline", async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(
    nav.getByRole("link", { name: "My escalations , needs a connection" }),
  ).toHaveAttribute("aria-disabled", "true");
  await context.setOffline(false);
  await expect(nav.getByRole("link", { name: "My escalations" })).toHaveAttribute(
    "href",
    "/escalations",
  );
});

test("the assistant keeps its conversation across pages until sign-out", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Assistant" }).click();
  const assistant = page.getByRole("dialog", { name: "Assistant" });
  await assistant.getByLabel("Your question").fill("What is short on Friday?");
  await assistant.getByRole("button", { name: "Close" }).click();

  await nav.getByRole("link", { name: "My escalations" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My escalations" })).toBeVisible();
  await nav.getByRole("button", { name: "Assistant" }).click();
  await expect(assistant.getByLabel("Your question")).toHaveValue("What is short on Friday?");
  await assistant.getByRole("button", { name: "Close" }).click();

  // Private data is cleared on sign-out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
  await nav.getByRole("button", { name: "Assistant" }).click();
  await expect(assistant.getByLabel("Your question")).toHaveValue("");
});
