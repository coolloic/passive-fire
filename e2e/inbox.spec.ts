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

const nav = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });

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

// AC-8.4 regression: the team leader stays signed in on their own device while the project
// manager resolves elsewhere. In-app navigation must show the new state at once, not a page the
// client router cached before the resolution.
test("a team leader who stays signed in sees the resolution on the next in-app navigation", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Team Leader");
  await page
    .getByRole("region", { name: day(3) })
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "Escalate" }).click();
  await page.getByRole("button", { name: "Send escalation" }).click();
  await expect(page).toHaveURL(/\/escalations\/[0-9a-f-]{36}$/);
  const escalationPath = new URL(page.url()).pathname;

  // Visit both pages so the client router has them cached as Open.
  await nav(page, "My escalations").click();
  await expect(page).toHaveURL(/\/escalations$/);
  const mine = page
    .getByRole("main")
    .locator("a[href^='/escalations/']")
    .filter({ hasText: "Crew Alpha (SAMPLE)" });
  await expect(mine).toContainText("Open");
  await mine.click();
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("Open");

  const manager = await (await browser.newContext()).newPage();
  await signInAs(manager, "Project Manager");
  await expect(manager).toHaveURL(/\/inbox$/);
  await manager.goto(escalationPath.replace("/escalations/", "/inbox/"));
  await manager.getByRole("radio", { name: "Planned work rescheduled" }).check();
  await manager.getByRole("button", { name: "Resolve escalation" }).click();
  await expect(manager.getByRole("region", { name: "Summary" })).toContainText("Resolved");
  await manager.context().close();

  // Back on the team leader's device, without reloading.
  await nav(page, "Planned work").click();
  await expect(page).toHaveURL(/\/planned-work$/);
  await nav(page, "My escalations").click();
  await expect(mine).toContainText("Resolved");
  await expect(mine).toContainText("Resolution: Planned work rescheduled");
  await mine.click();
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("Resolved");
});

test("a team leader cannot open the project manager's escalation page", async ({ page }) => {
  await signInAs(page, "Team Leader");
  await expect(page).toHaveURL(/\/planned-work$/);
  await page.goto("/inbox/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/planned-work$/);
});
