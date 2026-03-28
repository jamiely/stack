import { expect, test } from "@playwright/test";

test("title overlay and debug panel render, then the prototype starts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Tower Stacker")).toBeVisible();
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.getByTestId("start-button").click();

  await expect(page.getByText("Prototype In Motion")).toBeVisible();
  await expect(page.getByTestId("score-value")).toHaveText("1");
});
