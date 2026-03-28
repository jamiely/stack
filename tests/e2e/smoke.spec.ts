import { expect, test } from "@playwright/test";

test("title overlay renders without debug controls, then the run starts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Tower Stacker")).toBeVisible();
  await expect(page.getByTestId("debug-panel")).toHaveCount(0);

  await page.getByTestId("start-button").click();

  await expect(page.getByTestId("score-value")).toHaveText("0");
  await expect(page.getByTestId("status-message")).toContainText("Press space");
});

test("debug controls render only when the debug query param is present", async ({ page }) => {
  await page.goto("/?debug");

  await expect(page.getByTestId("debug-panel")).toBeVisible();
});
