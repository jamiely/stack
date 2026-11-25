import { expect, test, type Page } from "@playwright/test";
import type { PublicGameState } from "../../src/game/types";

type TestApi = {
  startGame: () => void;
  setActiveOffset: (offset: number) => boolean;
  stopActiveSlab: () => void;
  stepSimulation: (steps?: number) => void;
  getState: () => PublicGameState;
};

async function slabBoundsAt(page: Page, offset: number) {
  return page.evaluate((value) => {
    const api = (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!;
    api.setActiveOffset(value);
    api.stepSimulation(120);
    api.setActiveOffset(value);
    return api.getState().activeScreenBounds;
  }, offset);
}

// Side to side the whole slab stays in frame; its top face stays on screen (its near lower corner may dip below the
// bottom edge at the travel extremes, as it does in landscape).
function expectOnScreen(bounds: PublicGameState["activeScreenBounds"]) {
  expect(bounds).not.toBeNull();
  expect(bounds!.minX).toBeGreaterThanOrEqual(-1);
  expect(bounds!.maxX).toBeLessThanOrEqual(1);
  expect(bounds!.maxY).toBeLessThanOrEqual(1);
  expect(bounds!.maxY).toBeGreaterThan(-1);
}

// Vertical cabinet monitor: Electron fullscreen on a display rotated to portrait.
test("tall viewport keeps the moving slab, HUD and game-over card in frame", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/?test&seed=3");
  await page.evaluate(() => (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!.startGame());

  // The slab travels motionRange (4.5) either side of the stack, along x then z; both ends must stay on screen.
  for (const axis of ["x", "z"]) {
    await expect.poll(() => page.evaluate(() => (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!.getState().activeAxis)).toBe(axis);
    for (const offset of [-4.5, 4.5]) {
      expectOnScreen(await slabBoundsAt(page, offset));
    }
    await page.evaluate(() => {
      const api = (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!;
      api.setActiveOffset(0);
      api.stopActiveSlab();
      api.stepSimulation(60);
    });
  }
  for (const id of ["score-value", "height-value", "combo-value"]) {
    await expect(page.getByTestId(id)).toBeInViewport({ ratio: 1 });
  }
  await expect(page.locator("canvas")).toHaveJSProperty("clientHeight", 1920);

  await page.evaluate(() => {
    const api = (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!;
    api.setActiveOffset(10);
    api.stopActiveSlab();
    api.stepSimulation(90);
  });
  await expect(page.getByTestId("overlay-title")).toHaveText("Tower Fell");
  await expect(page.getByTestId("menu-overlay")).toBeInViewport({ ratio: 1 });
});

test("resizing between landscape and portrait reframes the slab", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?test&seed=3");
  await page.evaluate(() => (window as Window & { __towerStackerTestApi?: TestApi }).__towerStackerTestApi!.startGame());
  expectOnScreen(await slabBoundsAt(page, 4.5));

  await page.setViewportSize({ width: 1080, height: 1920 });
  await expect.poll(() => page.evaluate(() => window.innerHeight)).toBe(1920);
  expectOnScreen(await slabBoundsAt(page, 4.5));
  expectOnScreen(await slabBoundsAt(page, -4.5));
});
