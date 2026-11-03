import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "../src/lib/sample-data/site";
import { createOpenEscalation, resetEscalations } from "./support/database";
import { signInWithServiceWorker } from "./support/session";

// Spec NFR: WCAG 2.2 AA. axe finds the automatable subset; keyboard and screen reader checks
// remain manual (docs/test-strategy.md).
test.describe.configure({ mode: "serial" });

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const plannedWorkId = (key: string) => SAMPLE_PLANNED_WORK.find((work) => work.key === key)!.id;
const teamLeaderId = SAMPLE_PERSONAS.find((persona) => persona.role === "team_leader")!.id;

/** Scans the page in light and dark mode (colour contrast differs between them). */
async function expectNoViolations(page: Page) {
  const summary: string[] = [];
  // Colour transitions would otherwise be measured mid-way after switching the scheme.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    summary.push(
      ...violations.map(
        (violation) =>
          `${colorScheme} ${violation.id} (${violation.impact}): ${violation.nodes
            .map((node) => node.target.join(" "))
            .join(", ")}`,
      ),
    );
  }
  await page.emulateMedia({ colorScheme: "light" });
  expect(summary).toEqual([]);
}

async function signInAs(page: Page, persona: "Team Leader" | "Project Manager") {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: `Continue as ${persona} (SAMPLE)` }).click();
  await expect(page).toHaveURL(persona === "Team Leader" ? /\/planned-work$/ : /\/inbox$/);
}

test.beforeEach(async () => {
  await resetEscalations();
});

test("sign-in and the offline page", async ({ page }) => {
  await page.goto("/sign-in");
  await expectNoViolations(page);
  await page.goto("/offline");
  await expectNoViolations(page);
});

test("team leader pages", async ({ page }) => {
  const escalationId = await createOpenEscalation(plannedWorkId("PW2"), teamLeaderId);
  await signInAs(page, "Team Leader");
  await expect(page.getByRole("heading", { level: 1, name: "Planned work" })).toBeVisible();
  await expectNoViolations(page);

  for (const path of [
    `/planned-work/${plannedWorkId("PW3")}`,
    `/planned-work/${plannedWorkId("PW3")}/escalate`,
    "/escalations",
    `/escalations/${escalationId}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);
  }

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Assistant" })
    .click();
  await expect(page.getByRole("dialog", { name: "Assistant" })).toBeVisible();
  await expectNoViolations(page);
});

test("project manager pages", async ({ page }) => {
  const escalationId = await createOpenEscalation(plannedWorkId("PW2"), teamLeaderId);
  await signInAs(page, "Project Manager");
  await expectNoViolations(page);
  await page.goto(`/inbox/${escalationId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});

test("offline states", async ({ page, context }) => {
  // Offline pages are only saved once the service worker controls the page.
  await signInWithServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/You're offline/)).toBeVisible();
  await expectNoViolations(page);
  await context.setOffline(false);
});
