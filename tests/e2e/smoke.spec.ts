import { expect, test } from "@playwright/test";

test("run autostarts and title card briefly animates out", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("intro-title")).toHaveText("Tower stacker");
  await expect(page.getByTestId("debug-panel")).toHaveCount(0);
  await expect(page.getByTestId("status-card")).toHaveCount(0);

  await expect(page.getByTestId("score-value")).toHaveText("0");
  await expect(page.getByTestId("menu-overlay")).toHaveClass(/overlay--hidden/);

  await expect(page.getByTestId("intro-title")).toHaveClass(/intro-title--exit/);
  await expect(page.getByTestId("intro-title")).toHaveClass(/intro-title--hidden/);
});

test("debug controls and status surfaces render only with the debug query param", async ({ page }) => {
  await page.goto("/?debug");

  await expect(page.getByTestId("debug-panel")).toBeVisible();
  await expect(page.getByTestId("status-card")).toBeVisible();
  await expect(page.getByTestId("status-message")).toBeVisible();
  await expect(page.getByTestId("overlay-body")).toBeVisible();
});
