import { expect, test, type Page } from "@playwright/test";
import { addDays, relativeDayLabel, todayIso } from "../src/lib/format/date";
import { resetEscalations } from "./support/database";

// Escalations live in a shared database, so these tests run one at a time.
test.describe.configure({ mode: "serial" });

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);

test.beforeEach(async ({ page }) => {
  await resetEscalations();
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
});

async function openPlannedWork(page: Page, offset: number) {
  await page
    .getByRole("region", { name: day(offset) })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/planned-work\/[0-9a-f-]{36}$/);
}

test("raise an escalation with a note, then track it", async ({ page }) => {
  await openPlannedWork(page, 3);
  const detailUrl = page.url();
  await page.getByRole("link", { name: "Escalate" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Escalate a shortage" })).toBeVisible();
  await expect(page.getByRole("region", { name: "What will be escalated" })).toContainText(
    "Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)",
  );

  await page.getByLabel("Note for the project manager (optional)").fill("Need these by Thursday");
  await page.getByRole("button", { name: "Send escalation" }).click();

  await expect(page).toHaveURL(/\/escalations\/[0-9a-f-]{36}$/);
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Open");
  await expect(page.getByRole("region", { name: "What was escalated" })).toContainText(
    "Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)",
  );
  await expect(page.getByRole("region", { name: "Notes" })).toContainText("Need these by Thursday");

  await page.getByLabel("Add a note").fill("Can we split the delivery?");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("region", { name: "Notes" })).toContainText(
    "Can we split the delivery?",
  );

  await page.goto(detailUrl);
  await expect(page.getByRole("link", { name: "Escalate" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View open escalation" })).toBeVisible();

  await page.goto("/escalations");
  await expect(page.getByRole("link").filter({ hasText: "Open" })).toHaveCount(1);
});

test("a second escalation is refused and points to the open one", async ({ page }) => {
  await openPlannedWork(page, 2);
  const escalateUrl = `${page.url()}/escalate`;
  await page.getByRole("link", { name: "Escalate" }).click();
  await page.getByRole("button", { name: "Send escalation" }).click();
  await expect(page).toHaveURL(/\/escalations\//);

  await page.goto(escalateUrl);
  await expect(
    page.getByText("An escalation is already open for this planned work."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send escalation" })).toHaveCount(0);
});

test("a note that is too long cannot be sent", async ({ page }) => {
  await openPlannedWork(page, 7);
  await page.getByRole("link", { name: "Escalate" }).click();
  await page.getByLabel("Note for the project manager (optional)").fill("x".repeat(1001));
  await expect(page.getByText("1001 / 1000 characters")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send escalation" })).toBeDisabled();
});

test("Ready planned work has nothing to escalate", async ({ page }) => {
  await openPlannedWork(page, 1);
  await page.goto(`${page.url()}/escalate`);
  await expect(
    page.getByText("This planned work is Ready, so there is nothing to escalate."),
  ).toBeVisible();
});

test("my escalations starts empty", async ({ page }) => {
  await page.getByRole("link", { name: "My escalations" }).click();
  await expect(page.getByText("You haven't raised any escalations.")).toBeVisible();
});

// E2E never calls the real model; without ANTHROPIC_API_KEY drafting explains itself and the
// team leader writes the note.
test("drafting without the assistant leaves the note to the team leader", async ({ page }) => {
  await openPlannedWork(page, 3);
  await page.getByRole("link", { name: "Escalate" }).click();
  await page.getByRole("button", { name: "Draft with AI" }).click();
  await expect(
    page.getByText("The assistant isn't set up on this server. Write the note yourself."),
  ).toBeVisible();

  await page.getByLabel("Note for the project manager (optional)").fill("Need these by Thursday");
  await page.getByRole("button", { name: "Send escalation" }).click();
  await expect(page).toHaveURL(/\/escalations\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: "Notes" })).toContainText("Need these by Thursday");
});
