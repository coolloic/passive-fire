import { expect, test, type Page } from "@playwright/test";
import { addDays, relativeDayLabel, todayIso } from "../src/lib/format/date";
import { resetEscalations } from "./support/database";

test.describe.configure({ mode: "serial" });

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);

async function signInAs(page: Page, persona: "Team Leader" | "Project Manager") {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: `Continue as ${persona} (SAMPLE)` }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

test.beforeEach(async () => {
  await resetEscalations();
});

test("the inbox is empty when nothing has been escalated", async ({ page }) => {
  await signInAs(page, "Project Manager");
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByText("No escalations yet.")).toBeVisible();
});

test("team leader raises, project manager resolves, team leader sees the resolution", async ({
  page,
}) => {
  await signInAs(page, "Team Leader");
  await page
    .getByRole("region", { name: day(3) })
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "Escalate" }).click();
  await page
    .getByLabel("Note for the project manager (optional)")
    .fill("Crew Alpha is booked for this day");
  await page.getByRole("button", { name: "Send escalation" }).click();
  await expect(page).toHaveURL(/\/escalations\/[0-9a-f-]{36}$/);
  await signOut(page);

  await signInAs(page, "Project Manager");
  await expect(page).toHaveURL(/\/inbox$/);
  const item = page.getByRole("link").filter({ hasText: "Crew Alpha (SAMPLE)" });
  await expect(item).toContainText("Open");
  await expect(item).toContainText("by Sam Taylor (SAMPLE)");
  await item.click();
  await expect(page.getByRole("region", { name: "Notes" })).toContainText(
    "Crew Alpha is booked for this day",
  );
  await expect(page.getByRole("region", { name: "What was escalated" })).toContainText(
    "Short by 10 × Intumescent pipe collar 50 mm (SAMPLE)",
  );

  await page.getByRole("button", { name: "Resolve escalation" }).click();
  await expect(page.getByRole("region", { name: "Resolve" }).getByRole("alert")).toHaveText(
    "Choose how the shortage was resolved.",
  );

  await page.getByRole("radio", { name: "Stock arriving" }).check();
  await page
    .getByLabel("Comment for the team leader (optional)")
    .fill("Collars arriving Thursday morning");
  await page.getByRole("button", { name: "Resolve escalation" }).click();
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Resolved");
  await expect(summary).toContainText(
    "Resolution: Stock arriving — Collars arriving Thursday morning",
  );
  await expect(page.getByRole("button", { name: "Resolve escalation" })).toHaveCount(0);
  await expect(page.getByLabel("Add a note")).toHaveCount(0);
  await signOut(page);

  await signInAs(page, "Team Leader");
  await page.getByRole("link", { name: "My escalations" }).click();
  await expect(page).toHaveURL(/\/escalations$/);
  const mine = page.getByRole("link").filter({ hasText: "Crew Alpha (SAMPLE)" });
  await expect(mine).toContainText("Resolved");
  await expect(mine).toContainText("Resolution: Stock arriving");
});

test("a team leader cannot open the project manager's escalation page", async ({ page }) => {
  await signInAs(page, "Team Leader");
  await expect(page).toHaveURL(/\/planned-work$/);
  await page.goto("/inbox/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/planned-work$/);
});
