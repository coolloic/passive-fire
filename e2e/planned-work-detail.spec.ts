import { expect, test, type Page } from "@playwright/test";
import { addDays, relativeDayLabel, todayIso } from "../src/lib/format/date";

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);

async function openPlannedWork(page: Page, offset: number) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
  await page
    .getByRole("region", { name: day(offset) })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/planned-work\/[0-9a-f-]{36}$/);
}

test("a Short planned work explains why, product by product, and offers to escalate", async ({
  page,
}) => {
  await openPlannedWork(page, 3);
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Short");
  await expect(summary.getByRole("link", { name: "Escalate" })).toBeVisible();

  const scenarios = page.getByRole("region", { name: "Scenarios" });
  await expect(scenarios).toContainText("Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)");
  await expect(scenarios).toContainText("14 already allocated to earlier planned work");
  await expect(scenarios).toContainText(
    "Delivery of 10 is due on the work date, so it is not counted",
  );

  const collar = page
    .getByRole("region", { name: "Products" })
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { name: "Intumescent pipe collar 50 mm (SAMPLE)" }),
    });
  await expect(collar.getByRole("definition")).toHaveText(["16", "6", "10"]);
});

test("a Ready planned work that relies on a delivery says so and offers no escalation", async ({
  page,
}) => {
  await openPlannedWork(page, 5);
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Ready");
  await expect(summary).toContainText("Relies on delivery");
  await expect(summary.getByRole("link", { name: "Escalate" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Products" })).toContainText(
    /Relies on delivery of 8 due /,
  );
});

test("an Unknown planned work names the missing facts", async ({ page }) => {
  await openPlannedWork(page, 9);
  const scenarios = page.getByRole("region", { name: "Scenarios" });
  await expect(scenarios).toContainText("No solution nominated for this scenario");
  await expect(scenarios).toContainText(
    "No stock record for Intumescent pipe collar 65 mm (SAMPLE)",
  );
  await expect(
    page.getByRole("region", { name: "Summary" }).getByRole("link", { name: "Escalate" }),
  ).toBeVisible();
});

test("the back link returns to the list", async ({ page }) => {
  await openPlannedWork(page, 1);
  await page.getByRole("link", { name: "← Back to planned work" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
});

for (const id of ["00000000-0000-4000-8000-000000000000", "not-a-real-id"]) {
  test(`planned work that does not exist shows not found (${id})`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
    await expect(page).toHaveURL(/\/planned-work$/);
    await page.goto(`/planned-work/${id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Planned work not found" }),
    ).toBeVisible();
  });
}

test("has no horizontal scrolling on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openPlannedWork(page, 2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
