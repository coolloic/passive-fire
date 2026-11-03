import { expect, test } from "@playwright/test";

// E2E never calls the real model. Without ANTHROPIC_API_KEY the assistant reports that it is not
// set up; the answering path is covered by unit tests with a stubbed tool runner.
test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as Team Leader (SAMPLE)" }).click();
  await expect(page).toHaveURL(/\/planned-work$/);
});

test("the assistant explains when it is not configured and keeps the question", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Assistant" })
    .click();
  const panel = page.getByRole("dialog", { name: "Assistant" });
  await panel.getByLabel("Your question").fill("What is short on Friday?");
  await panel.getByRole("button", { name: "Ask" }).click();
  await expect(panel.getByRole("alert")).toHaveText("The assistant isn't set up on this server.");
  await expect(panel.getByLabel("Your question")).toHaveValue("What is short on Friday?");
});

test("the assistant needs a connection", async ({ page, context }) => {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Assistant" })
    .click();
  await context.setOffline(true);
  const panel = page.getByRole("dialog", { name: "Assistant" });
  await expect(panel.getByRole("status")).toHaveText("The assistant needs a connection.");
  await expect(panel.getByLabel("Your question")).toBeDisabled();
  await context.setOffline(false);
});

test("the assistant API refuses signed-out callers", async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  const response = await anonymous.post("/api/assistant", {
    data: { messages: [{ role: "user", content: "Hi" }] },
  });
  expect(response.status()).toBe(401);
  await anonymous.dispose();
});

test("the draft API refuses signed-out callers", async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  const response = await anonymous.post("/api/assistant/draft", {
    data: { plannedWorkId: "a0000000-0000-4000-8005-000000000003" },
  });
  expect(response.status()).toBe(401);
  await anonymous.dispose();
});
