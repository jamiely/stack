import { expect, test } from "@playwright/test";

async function getTestState(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const api = (window as Window & { __towerStackerTestApi?: { getState: () => unknown } }).__towerStackerTestApi;
    return api?.getState() ?? null;
  });
}

test("test API is only exposed in test mode and supports deterministic stepping", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() =>
        typeof (window as Window & { __towerStackerTestApi?: unknown }).__towerStackerTestApi,
      ),
    )
    .toBe("undefined");

  await page.goto("/?test");
  await expect
    .poll(() =>
      page.evaluate(() =>
        typeof (window as Window & { __towerStackerTestApi?: unknown }).__towerStackerTestApi,
      ),
    )
    .toBe("object");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
      };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setPaused(true);
  });

  const beforeStep = await getTestState(page);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
    }).__towerStackerTestApi;

    api?.stepSimulation(1);
  });

  const afterStep = await getTestState(page);

  expect(beforeStep).not.toBeNull();
  expect(afterStep).not.toBeNull();
  expect(afterStep?.activeAxis).toBe(beforeStep?.activeAxis);
  expect(afterStep?.activePosition?.x).toBeGreaterThan(beforeStep?.activePosition?.x ?? -Infinity);
});

test("keyboard and pointer input both stop slabs", async ({ page }) => {
  await page.goto("/?test");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { startGame: () => void; setActiveOffset: (offset: number) => boolean };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setActiveOffset(0);
  });

  await page.keyboard.press("Space");

  await expect.poll(async () => (await getTestState(page))?.score).toBe(1);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { setActiveOffset: (offset: number) => boolean };
    }).__towerStackerTestApi;

    api?.setActiveOffset(0);
  });

  await page.locator(".game-shell").click({ position: { x: 12, y: 12 } });

  await expect.poll(async () => (await getTestState(page))?.score).toBe(2);
});

test("miss transitions to game over and restart resets state", async ({ page }) => {
  await page.goto("/?test");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setActiveOffset: (offset: number) => boolean;
        stopActiveSlab: () => void;
      };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setActiveOffset(10);
    api?.stopActiveSlab();
  });

  await expect(page.getByTestId("overlay-title")).toHaveText("Tower Fell");
  await expect.poll(async () => (await getTestState(page))?.gameState).toBe("game_over");
  await expect.poll(async () => (await getTestState(page))?.score).toBe(0);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { restartGame: () => void };
    }).__towerStackerTestApi;

    api?.restartGame();
  });

  await expect.poll(async () => (await getTestState(page))?.gameState).toBe("playing");
  await expect.poll(async () => (await getTestState(page))?.score).toBe(0);
  await expect.poll(async () => (await getTestState(page))?.activeAxis).not.toBeNull();
});

test("debug controls can tune movement speed at runtime", async ({ page }) => {
  await page.goto("/?debug&test");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
      };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setPaused(true);
  });

  const baseState = await getTestState(page);
  expect(baseState?.activeAxis).toBe("x");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
    }).__towerStackerTestApi;

    api?.stepSimulation(1);
  });

  const afterBaseStep = await getTestState(page);
  const baseDelta = (afterBaseStep?.activePosition?.x ?? 0) - (baseState?.activePosition?.x ?? 0);

  await page.locator('input[data-debug-key="motionSpeed"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect.poll(async () => (await getTestState(page))?.debugConfig.motionSpeed).toBe(5);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => { debugConfig: { motionRange: number } };
        setActiveOffset: (offset: number) => boolean;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    const state = api?.getState();
    if (!state) {
      return;
    }

    api.setActiveOffset(-state.debugConfig.motionRange);
    api.stepSimulation(1);
  });

  const afterTunedStep = await getTestState(page);
  const tunedDelta = (afterTunedStep?.activePosition?.x ?? 0) + (afterTunedStep?.debugConfig.motionRange ?? 0);

  expect(baseDelta).toBeGreaterThan(0);
  expect(tunedDelta).toBeGreaterThan(baseDelta * 1.5);
});
