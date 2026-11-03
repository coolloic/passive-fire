import { expect, test } from "@playwright/test";
import { relativeDayLabel, todayIso, addDays } from "../src/lib/format/date";

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);

// Expected readiness for the SAMPLE site (src/lib/sample-data/site.ts).
const EXPECTED = [
  { offset: 1, state: "Ready", reliesOnDelivery: false },
  { offset: 2, state: "Short", reliesOnDelivery: false },
  { offset: 3, state: "Short", reliesOnDelivery: false },
  { offset: 5, state: "Ready", reliesOnDelivery: true },
  { offset: 7, state: "Unknown", reliesOnDelivery: false },
  { offset: 9, state: "Unknown", reliesOnDelivery: false },
  { offset: 11, state: "Short", reliesOnDelivery: false },
];

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
});

test("shows each planned work under its date with its readiness", async ({ page }) => {
  const headings = page.getByRole("heading", { level: 2 });
  await expect(headings).toHaveText(EXPECTED.map((entry) => day(entry.offset)));

  for (const entry of EXPECTED) {
    const region = page.getByRole("region", { name: day(entry.offset) });
    const card = region.getByRole("link");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(entry.state);
    await expect(card).toContainText("Harbour View Apartments (SAMPLE)");
    if (entry.reliesOnDelivery) await expect(card).toContainText("Relies on delivery");
    else await expect(card).not.toContainText("Relies on delivery");
  }
});

test("does not list planned work from before today", async ({ page }) => {
  await expect(page.getByRole("region", { name: day(-3) })).toHaveCount(0);
});

test("cards are large enough to tap", async ({ page }) => {
  const box = await page.getByRole("link").first().boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

for (const width of [375, 768, 1280]) {
  test(`has no horizontal scrolling at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}
