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

test("mobile debug panel can collapse and expand without leaving the viewport blocked", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?debug&test&paused=1");

  const panel = page.getByTestId("debug-panel");
  const body = page.getByTestId("debug-panel-body");
  const toggle = page.getByTestId("debug-panel-toggle");

  await expect(panel).toBeVisible();
  await expect(body).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await toggle.click();

  await expect(toggle).toHaveText(/Show debug/i);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(body).toBeHidden();
  await expect(panel).toHaveClass(/debug-panel--collapsed/);
  await expect(panel).toBeInViewport();

  await toggle.click();

  await expect(toggle).toHaveText(/Hide debug/i);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(body).toBeVisible();
});
