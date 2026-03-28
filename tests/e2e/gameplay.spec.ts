import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface E2EState {
  gameState: "idle" | "playing" | "game_over";
  score: number;
  height: number;
  level: number;
  activeAxis: "x" | "z" | null;
  activePosition: { x: number; y: number; z: number } | null;
  lastPlacementOutcome: "landed" | "perfect" | "miss" | null;
  combo: {
    current: number;
    best: number;
    target: number;
    rewardReady: boolean;
  };
  debugConfig: {
    motionSpeed: number;
    motionRange: number;
  };
  testMode: {
    enabled: boolean;
    paused: boolean;
    fixedStepSeconds: number;
    seed: number | null;
  };
}

async function getTestState(page: Page): Promise<E2EState | null> {
  return page.evaluate(() => {
    const api = (window as Window & { __towerStackerTestApi?: { getState: () => E2EState } }).__towerStackerTestApi;
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
  expect(afterStep?.activePosition?.x).not.toBe(beforeStep?.activePosition?.x);
});

test("test mode paused boot can be toggled with query params", async ({ page }) => {
  await page.goto("/?test");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { startGame: () => void };
    }).__towerStackerTestApi;

    api?.startGame();
  });

  const pausedStart = await getTestState(page);
  await page.waitForTimeout(150);
  const pausedAfterWait = await getTestState(page);

  expect(pausedStart?.activePosition?.x).toBe(pausedAfterWait?.activePosition?.x);

  await page.goto("/?test&paused=0");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { startGame: () => void };
    }).__towerStackerTestApi;

    api?.startGame();
  });

  const runningStart = await getTestState(page);
  await page.waitForTimeout(150);
  const runningAfterWait = await getTestState(page);

  expect(runningAfterWait?.activePosition?.x).not.toBe(runningStart?.activePosition?.x);
});

test("seeded startup produces stable active-slab spawn states", async ({ page }) => {
  const getSeededStart = async (seed: number) => {
    await page.goto(`/?test&seed=${seed}`);

    return page.evaluate(() => {
      const api = (window as Window & {
        __towerStackerTestApi?: {
          startGame: () => void;
          setPaused: (paused: boolean) => void;
          getState: () => E2EState;
        };
      }).__towerStackerTestApi;

      if (!api) {
        return null;
      }

      api.startGame();
      api.setPaused(true);
      const state = api.getState();

      return {
        activeAxis: state.activeAxis,
        activePosition: state.activePosition,
        seed: state.testMode.seed,
      };
    });
  };

  const firstSeedRunA = await getSeededStart(42);
  const firstSeedRunB = await getSeededStart(42);
  const otherSeedRun = await getSeededStart(7);

  expect(firstSeedRunA).not.toBeNull();
  expect(firstSeedRunB).not.toBeNull();
  expect(otherSeedRun).not.toBeNull();

  expect(firstSeedRunA).toEqual(firstSeedRunB);
  expect(firstSeedRunA?.seed).toBe(42);
  expect(otherSeedRun?.seed).toBe(7);

  expect(firstSeedRunA?.activePosition).not.toEqual(otherSeedRun?.activePosition);
});

test("scripted placement sequence is deterministic across runs", async ({ page }) => {
  const runScriptedSequence = async () => {
    await page.goto("/?test&paused=0&seed=42");

    return page.evaluate(() => {
      const api = (window as Window & {
        __towerStackerTestApi?: {
          startGame: () => void;
          setPaused: (paused: boolean) => void;
          placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
          getState: () => E2EState;
        };
      }).__towerStackerTestApi;

      if (!api) {
        return null;
      }

      api.startGame();
      api.setPaused(true);

      const outcomes = [api.placeAtOffset(0), api.placeAtOffset(0.35), api.placeAtOffset(-0.2), api.placeAtOffset(0)];
      const state = api.getState();

      return {
        outcomes,
        score: state.score,
        height: state.height,
        level: state.level,
        activeAxis: state.activeAxis,
        activePosition: state.activePosition,
        lastPlacementOutcome: state.lastPlacementOutcome,
        seed: state.testMode.seed,
      };
    });
  };

  const first = await runScriptedSequence();
  const second = await runScriptedSequence();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(first).toEqual(second);
});

test("perfect streak reaches combo target and updates HUD/test API", async ({ page }) => {
  await page.goto("/?test&paused=0&seed=42");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        getState: () => E2EState;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);

    for (let index = 0; index < 8; index += 1) {
      api.placeAtOffset(0);
    }
  });

  await expect.poll(async () => (await getTestState(page))?.combo.current).toBe(8);
  await expect.poll(async () => (await getTestState(page))?.combo.rewardReady).toBe(true);
  await expect(page.getByTestId("combo-value")).toHaveText("8/8");
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
  const baseDelta = Math.abs((afterBaseStep?.activePosition?.x ?? 0) - (baseState?.activePosition?.x ?? 0));

  await page.locator('input[data-debug-key="motionSpeed"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect.poll(async () => (await getTestState(page))?.debugConfig.motionSpeed).toBe(5);

  const beforeTunedStep = await getTestState(page);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => { debugConfig: { motionRange: number } };
        setActiveOffset: (offset: number) => boolean;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    const state = api.getState();
    api.setActiveOffset(-state.debugConfig.motionRange);
    api.stepSimulation(1);
  });

  const afterTunedStep = await getTestState(page);
  const tunedDelta = Math.abs((afterTunedStep?.activePosition?.x ?? 0) - (beforeTunedStep?.activePosition?.x ?? 0));

  expect(baseDelta).toBeGreaterThan(0);
  expect(tunedDelta).toBeGreaterThan(baseDelta * 1.5);
});

test.describe("mobile touch pass", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("tap input on a mobile-sized viewport stops the active slab", async ({ page }) => {
    await page.goto("/?test");

    await page.evaluate(() => {
      const api = (window as Window & {
        __towerStackerTestApi?: { startGame: () => void; setActiveOffset: (offset: number) => boolean };
      }).__towerStackerTestApi;

      api?.startGame();
      api?.setActiveOffset(0);
    });

    await page.locator(".game-shell").tap({ position: { x: 20, y: 20 } });

    await expect.poll(async () => (await getTestState(page))?.score).toBe(1);
  });
});
