import { expect, test, type Page } from "@playwright/test";

async function signInAs(page: Page, persona: "Team Leader" | "Project Manager") {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: `Continue as ${persona} (SAMPLE)` }).click();
}

test.describe("demo sign-in", () => {
  test("signed-out visitors are sent to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "QAntum Team Leader" })).toBeVisible();

    await page.goto("/planned-work");
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("the team leader lands on planned work", async ({ page }) => {
    await signInAs(page, "Team Leader");
    await expect(page).toHaveURL(/\/planned-work$/);
    await expect(page.getByRole("heading", { level: 1, name: "Planned work" })).toBeVisible();
    await expect(page.getByRole("banner")).toContainText("Sam Taylor (SAMPLE)");
  });

  test("the project manager lands on the inbox", async ({ page }) => {
    await signInAs(page, "Project Manager");
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByRole("heading", { level: 1, name: "Escalation inbox" })).toBeVisible();
    await expect(page.getByRole("banner")).toContainText("Priya Shah (SAMPLE)");
  });

  test("a team leader is refused the project manager's inbox", async ({ page }) => {
    await signInAs(page, "Team Leader");
    await expect(page).toHaveURL(/\/planned-work$/);
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/planned-work$/);
    await expect(page.getByRole("heading", { name: "Escalation inbox" })).toHaveCount(0);
  });

  test("a project manager is refused the team leader's planned work", async ({ page }) => {
    await signInAs(page, "Project Manager");
    await expect(page).toHaveURL(/\/inbox$/);
    await page.goto("/planned-work");
    await expect(page).toHaveURL(/\/inbox$/);
  });

  test("signed-in users skip the sign-in page", async ({ page }) => {
    await signInAs(page, "Team Leader");
    await expect(page).toHaveURL(/\/planned-work$/);
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/planned-work$/);
  });

  test("signing out ends the session and the back button shows nothing private", async ({
    page,
  }) => {
    await signInAs(page, "Team Leader");
    await expect(page).toHaveURL(/\/planned-work$/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Planned work" })).toHaveCount(0);
    await page.goto("/planned-work");
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
