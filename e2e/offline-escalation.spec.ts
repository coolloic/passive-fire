import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "../src/lib/sample-data/site";
import { addDays, relativeDayLabel, todayIso } from "../src/lib/format/date";
import { countEscalations, createOpenEscalation, resetEscalations } from "./support/database";
import { signInWithServiceWorker } from "./support/session";

test.describe.configure({ mode: "serial" });

const today = todayIso();
const day = (offset: number) => relativeDayLabel(addDays(today, offset), today);
const plannedWorkId = (key: string) => SAMPLE_PLANNED_WORK.find((work) => work.key === key)!.id;
const teamLeaderId = SAMPLE_PERSONAS.find((persona) => persona.role === "team_leader")!.id;

test.beforeEach(async ({ context }) => {
  await resetEscalations();
  await context.setOffline(false);
});

test.afterEach(async ({ context }) => {
  await context.setOffline(false);
});

async function escalateOffline(page: Page, offset: number, note: string) {
  await page
    .getByRole("region", { name: day(offset) })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/planned-work\/[0-9a-f-]{36}$/);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByText(/You're offline/)).toBeVisible();
  await page.getByRole("button", { name: "Escalate offline" }).click();
  await page.getByLabel("Note for the project manager (optional)").fill(note);
  await page.getByRole("button", { name: "Send escalation" }).click();
  await expect(
    page.getByText("Saved on this device. It will be sent when you're back online."),
  ).toBeVisible();
}

test("an escalation raised offline waits on the device and is sent once on reconnect", async ({
  page,
  context,
}) => {
  await signInWithServiceWorker(page);
  await escalateOffline(page, 3, "Raised from the plant room");

  const waiting = page.getByRole("region", { name: "Waiting to send" });
  await expect(waiting).toContainText("Waiting to send");
  await expect(waiting.getByRole("button", { name: "Retry now" })).toBeDisabled();

  // Offline this is a full page load; reconnect only once the list has loaded.
  await page.getByRole("link", { name: "← Back to planned work" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
  await expect(page.getByRole("heading", { level: 1, name: "Planned work" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Waiting to send" })).toContainText(
    "Crew Alpha (SAMPLE)",
  );

  await context.setOffline(false);
  await expect(page.getByText("Sent 1 escalation saved on this device.")).toBeVisible();
  expect(await countEscalations(plannedWorkId("PW3"))).toBe(1);

  await page.goto("/escalations");
  await expect(page.getByRole("link").filter({ hasText: "Open" })).toHaveCount(1);
});

test("an escalation already open by the time it is sent is reported with a link", async ({
  page,
  context,
}) => {
  await signInWithServiceWorker(page);
  await escalateOffline(page, 2, "Collars short again");

  const existing = await createOpenEscalation(plannedWorkId("PW2"), teamLeaderId);
  await context.setOffline(false);

  const notice = page.getByRole("region", { name: "Waiting to send" }).getByRole("alert");
  await expect(notice).toContainText("An escalation was already open for this planned work.");
  await expect(notice.getByRole("link", { name: "View open escalation" })).toHaveAttribute(
    "href",
    `/escalations/${existing}`,
  );
  expect(await countEscalations(plannedWorkId("PW2"))).toBe(1);

  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByRole("region", { name: "Waiting to send" })).toHaveCount(0);
});
