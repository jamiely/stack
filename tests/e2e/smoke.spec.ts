import { expect, test } from "@playwright/test";

test("title overlay renders without debug controls, then the run starts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Tower Stacker")).toBeVisible();
  await expect(page.getByTestId("debug-panel")).toHaveCount(0);
  await expect(page.getByTestId("status-card")).toHaveCount(0);

  await page.getByTestId("start-button").click();

  await expect(page.getByTestId("score-value")).toHaveText("0");
  await expect(page.getByTestId("menu-overlay")).toHaveClass(/overlay--hidden/);
});

test("debug controls and status surfaces render only with the debug query param", async ({ page }) => {
  await page.goto("/?debug");

  await expect(page.getByTestId("debug-panel")).toBeVisible();
  await expect(page.getByTestId("status-card")).toBeVisible();
  await expect(page.getByTestId("status-message")).toBeVisible();
  await expect(page.getByTestId("overlay-body")).toBeVisible();
});
