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
  topDimensions: { width: number; depth: number; height: number } | null;
  combo: {
    current: number;
    best: number;
    target: number;
    rewardReady: boolean;
  };
  recovery: {
    rewardsEarned: number;
    slowdownPlacementsRemaining: number;
    speedMultiplier: number;
  };
  feedback: {
    audioEnabled: boolean;
    hapticsEnabled: boolean;
    audioSupported: boolean;
    hapticsSupported: boolean;
    audioUnlocked: boolean;
    eventsTriggered: number;
    audioEventsPlayed: number;
    hapticEventsPlayed: number;
    lastEvent: "placement_perfect" | "placement_landed" | "placement_miss" | "collapse_failure" | null;
  };
  distractions: {
    enabled: boolean;
    level: number;
    active: {
      tentacle: boolean;
      gorilla: boolean;
      tremor: boolean;
      ufo: boolean;
      contrastWash: boolean;
      clouds: boolean;
    };
    signals: {
      tentacle: number;
      gorilla: number;
      tremor: number;
      ufo: number;
      contrastWash: number;
      clouds: number;
    };
    visuals: {
      gorillaOpacity: number;
      ufoOpacity: number;
      cloudOpacity: number;
      contrastOpacity: number;
      tremorStrength: number;
    };
  };
  debugConfig: {
    motionSpeed: number;
    motionRange: number;
    comboTarget: number;
    recoveryGrowthMultiplier: number;
    recoverySlowdownFactor: number;
    recoverySlowdownPlacements: number;
    feedbackAudioEnabled: boolean;
    feedbackHapticsEnabled: boolean;
    distractionsEnabled: boolean;
    distractionTentacleStartLevel: number;
    distractionGorillaStartLevel: number;
    distractionUfoStartLevel: number;
    distractionCloudStartLevel: number;
    integrityPrecariousThreshold: number;
    integrityUnstableThreshold: number;
    integrityWobbleStrength: number;
    collapseDurationSeconds: number;
    collapseTiltStrength: number;
    collapseCameraPullback: number;
    collapseDropDistance: number;
    performanceQualityPreset: number;
    performanceAutoQualityEnabled: boolean;
    archivalKeepRecentLevels: number;
    archivalChunkSize: number;
    lodNearDistance: number;
    lodFarDistance: number;
    maxActiveDebris: number;
    debrisPoolLimit: number;
  };
  integrity: {
    tier: "stable" | "precarious" | "unstable";
    normalizedOffset: number;
    wobbleStrength: number;
    centerOfMass: { x: number; z: number };
    topCenter: { x: number; z: number };
    offset: { x: number; z: number };
  };
  collapse: {
    active: boolean;
    trigger: "miss" | "instability" | null;
    progress: number;
    cameraPullback: number;
    completed: boolean;
  };
  performance: {
    qualityPreset: "low" | "medium" | "high";
    requestedPreset: "low" | "medium" | "high";
    autoQualityEnabled: boolean;
    frameTimeMs: number;
    averageFrameTimeMs: number;
    frameBudgetMs: number;
    activeObjects: number;
    visibleSlabs: number;
    archivedSlabs: number;
    archivedChunks: number;
    debrisActive: number;
    debrisPooled: number;
    distractionLod: {
      gorilla: "high" | "medium" | "low";
      ufo: "high" | "medium" | "low";
      clouds: "high" | "medium" | "low";
      tremor: "high" | "medium" | "low";
    };
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

test("combo milestone triggers recovery reward growth + slowdown", async ({ page }) => {
  await page.goto("/?test&paused=0&seed=42");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);
    api.placeAtOffset(0.3);

    for (let index = 0; index < 8; index += 1) {
      api.placeAtOffset(0);
    }
  });

  await expect.poll(async () => (await getTestState(page))?.combo.current).toBe(8);
  await expect.poll(async () => (await getTestState(page))?.combo.rewardReady).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.recovery.rewardsEarned).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.recovery.slowdownPlacementsRemaining).toBe(3);
  await expect.poll(async () => (await getTestState(page))?.recovery.speedMultiplier).toBeLessThan(1);
  await expect.poll(async () => (await getTestState(page))?.topDimensions?.width).toBe(4);
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
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setActiveOffset(10);
    api?.stopActiveSlab();
    api?.stepSimulation(90);
  });

  await expect(page.getByTestId("overlay-title")).toHaveText("Tower Fell");
  await expect.poll(async () => (await getTestState(page))?.gameState).toBe("game_over");
  await expect.poll(async () => (await getTestState(page))?.score).toBe(0);
  await expect.poll(async () => (await getTestState(page))?.collapse.trigger).toBe("miss");
  await expect.poll(async () => (await getTestState(page))?.collapse.cameraPullback ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await getTestState(page))?.feedback.lastEvent).toBe("collapse_failure");

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

test("debug combo target + growth tuning changes recovery behavior", async ({ page }) => {
  await page.goto("/?debug&test&paused=0&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.locator('input[data-debug-key="comboTarget"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="recoveryGrowthMultiplier"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "1.5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect.poll(async () => (await getTestState(page))?.debugConfig.comboTarget).toBe(2);
  await expect.poll(async () => (await getTestState(page))?.debugConfig.recoveryGrowthMultiplier).toBe(1.5);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);
    api.placeAtOffset(0.8);
    api.placeAtOffset(0);
    api.placeAtOffset(0.4);
  });

  await expect.poll(async () => (await getTestState(page))?.recovery.rewardsEarned).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.combo.target).toBe(2);
  await expect.poll(async () => (await getTestState(page))?.topDimensions?.width).toBe(4);
});

test("debug distraction launch buttons can trigger channels on demand", async ({ page }) => {
  await page.goto("/?debug&test");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.locator('input[data-debug-key="distractionTentacleStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "80";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionGorillaStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "80";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionUfoStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "100";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionCloudStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "120";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

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

  await expect.poll(async () => (await getTestState(page))?.distractions.active.tentacle).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.gorilla).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.ufo).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.clouds).toBe(false);

  await page.getByTestId("debug-launch-tentacle").click();
  await page.getByTestId("debug-launch-gorilla").click();
  await page.getByTestId("debug-launch-tremor").click();
  await page.getByTestId("debug-launch-ufo").click();
  await page.getByTestId("debug-launch-contrastWash").click();
  await page.getByTestId("debug-launch-clouds").click();

  await expect.poll(async () => (await getTestState(page))?.distractions.active.tentacle).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.gorilla).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.tremor).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.ufo).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.contrastWash).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.clouds).toBe(true);

  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.gorillaOpacity ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.ufoOpacity ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.cloudOpacity ?? 0).toBeGreaterThan(0.1);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.contrastOpacity ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.tremorStrength ?? 0).toBeGreaterThan(0.9);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
    }).__towerStackerTestApi;

    api?.stepSimulation(500);
  });

  await expect.poll(async () => (await getTestState(page))?.distractions.active.gorilla).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.ufo).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.clouds).toBe(false);
});

test("gorilla/ufo/cloud actors are level-gated and core placement still works while active", async ({ page }) => {
  await page.goto("/?debug&test&paused=0&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.locator('input[data-debug-key="distractionTentacleStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionGorillaStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "4";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionUfoStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="distractionCloudStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "8";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
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
    api.stepSimulation(4);
  });

  await expect.poll(async () => (await getTestState(page))?.distractions.active.gorilla).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.ufo).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.clouds).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.gorillaOpacity ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.ufoOpacity ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.cloudOpacity ?? 0).toBeGreaterThan(0.1);

  await expect(page.getByTestId("actor-gorilla")).toBeVisible();
  await expect(page.getByTestId("actor-ufo")).toBeVisible();
  await expect(page.getByTestId("actor-clouds")).toBeVisible();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    api?.placeAtOffset(0);
    api?.stepSimulation(1);
  });

  await expect.poll(async () => (await getTestState(page))?.score).toBe(9);
  await expect.poll(async () => (await getTestState(page))?.lastPlacementOutcome).toBe("perfect");

  await page.locator('input[data-debug-key="distractionsEnabled"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
    }).__towerStackerTestApi;

    api?.stepSimulation(1);
  });

  await expect.poll(async () => (await getTestState(page))?.debugConfig.distractionsEnabled).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.gorilla).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.active.ufo).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.gorillaOpacity ?? 1).toBe(0);
  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.ufoOpacity ?? 0).toBeGreaterThan(0);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
    }).__towerStackerTestApi;

    api?.stepSimulation(90);
  });

  await expect.poll(async () => (await getTestState(page))?.distractions.visuals.ufoOpacity ?? 1).toBe(0);
});

test("integrity telemetry reports deterministic stable/precarious/unstable transitions", async ({ page }) => {
  await page.goto("/?debug&test&paused=0&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.locator('input[data-debug-key="prebuiltLevels"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="integrityPrecariousThreshold"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="integrityUnstableThreshold"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="integrityWobbleStrength"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.4";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);
    api.placeAtOffset(1.6);
  });

  await expect.poll(async () => (await getTestState(page))?.integrity.tier).toBe("precarious");
  await expect.poll(async () => (await getTestState(page))?.integrity.normalizedOffset ?? 0).toBeGreaterThan(0.2);
  await expect.poll(async () => (await getTestState(page))?.integrity.wobbleStrength ?? 0).toBeGreaterThan(0);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    api?.placeAtOffset(1.9);
  });

  await expect.poll(async () => (await getTestState(page))?.integrity.tier).toBe("unstable");
  await expect.poll(async () => (await getTestState(page))?.integrity.normalizedOffset ?? 0).toBeGreaterThan(0.6);
  await expect.poll(async () => (await getTestState(page))?.integrity.wobbleStrength).toBeCloseTo(0.4, 5);
});

test("unstable integrity triggers collapse fail sequence without requiring a hard miss", async ({ page }) => {
  await page.goto("/?debug&test");

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

  await page.locator('input[data-debug-key="prebuiltLevels"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="integrityPrecariousThreshold"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="integrityUnstableThreshold"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const scripted = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
        getState: () => E2EState;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    const outcomes = [api.placeAtOffset(1.6), api.placeAtOffset(1.9)];
    api.stepSimulation(180);
    return {
      outcomes,
      state: api.getState(),
    };
  });

  expect(scripted).not.toBeNull();
  expect(scripted?.outcomes.filter((outcome) => outcome === "miss")).toHaveLength(0);

  await expect.poll(async () => (await getTestState(page))?.integrity.tier).toBe("unstable");
  await expect.poll(async () => (await getTestState(page))?.gameState).toBe("game_over");
  await expect.poll(async () => (await getTestState(page))?.collapse.trigger).toBe("instability");
  await expect.poll(async () => (await getTestState(page))?.collapse.completed).toBe(true);
  await expect.poll(async () => (await getTestState(page))?.feedback.lastEvent).toBe("collapse_failure");
});

test("audio/haptics toggles gate runtime feedback emission", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeAudioContext {
      public state: AudioContextState = "running";
      public currentTime = 0;
      public destination = {} as AudioNode;

      public resume(): Promise<void> {
        this.state = "running";
        return Promise.resolve();
      }

      public createOscillator() {
        return {
          type: "triangle",
          frequency: { setValueAtTime: () => undefined },
          connect: () => undefined,
          start: () => undefined,
          stop: () => undefined,
        };
      }

      public createGain() {
        return {
          gain: {
            setValueAtTime: () => undefined,
            linearRampToValueAtTime: () => undefined,
          },
          connect: () => undefined,
        };
      }
    }

    Object.defineProperty(window, "AudioContext", {
      value: FakeAudioContext,
      configurable: true,
    });

    Object.defineProperty(navigator, "vibrate", {
      value: () => true,
      configurable: true,
    });
  });

  await page.goto("/?debug&test&paused=0");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);
    api.placeAtOffset(0);
  });

  await expect.poll(async () => (await getTestState(page))?.feedback.eventsTriggered).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.feedback.audioEventsPlayed).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.feedback.hapticEventsPlayed).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.feedback.lastEvent).toBe("placement_perfect");

  await page.locator('input[data-debug-key="feedbackAudioEnabled"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.locator('input[data-debug-key="feedbackHapticsEnabled"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await expect.poll(async () => (await getTestState(page))?.debugConfig.feedbackAudioEnabled).toBe(false);
  await expect.poll(async () => (await getTestState(page))?.debugConfig.feedbackHapticsEnabled).toBe(false);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
      };
    }).__towerStackerTestApi;

    api?.placeAtOffset(0.4);
  });

  await expect.poll(async () => (await getTestState(page))?.feedback.eventsTriggered).toBe(2);
  await expect.poll(async () => (await getTestState(page))?.feedback.audioEventsPlayed).toBe(1);
  await expect.poll(async () => (await getTestState(page))?.feedback.hapticEventsPlayed).toBe(1);
});

test("high-start-stack perf profile keeps input responsive with archival + quality controls", async ({ page }) => {
  await page.goto("/?debug&test&paused=0&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  const applyRange = async (key: string, value: string) => {
    await page.locator(`input[data-debug-key="${key}"]`).evaluate((node, next) => {
      const input = node as HTMLInputElement;
      input.value = String(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
  };

  await applyRange("prebuiltLevels", "8");
  await applyRange("performanceQualityPreset", "0");
  await applyRange("archivalKeepRecentLevels", "4");
  await applyRange("archivalChunkSize", "3");
  await applyRange("maxActiveDebris", "6");
  await applyRange("debrisPoolLimit", "12");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.setPaused(true);

    for (let index = 0; index < 12; index += 1) {
      api.placeAtOffset(index % 2 === 0 ? 0.9 : -0.9);
      api.stepSimulation(2);
    }

    api.setPaused(false);
  });

  await page.locator(".game-shell").click({ position: { x: 16, y: 16 } });

  await expect.poll(async () => (await getTestState(page))?.score ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await getTestState(page))?.performance.qualityPreset).toBe("low");
  await expect.poll(async () => (await getTestState(page))?.performance.archivedSlabs ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await getTestState(page))?.performance.archivedChunks ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await getTestState(page))?.performance.activeObjects ?? 0).toBeLessThan(80);
});

test("optimization toggles preserve deterministic scripted outcomes", async ({ page }) => {
  const runScript = async () => {
    await page.goto("/?debug&test&paused=0&seed=99");

    return page.evaluate(() => {
      const api = (window as Window & {
        __towerStackerTestApi?: {
          startGame: () => void;
          setPaused: (paused: boolean) => void;
          applyDebugConfig: (config: E2EState["debugConfig"]) => void;
          placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
          stepSimulation: (steps?: number) => void;
          getState: () => E2EState;
        };
      }).__towerStackerTestApi;

      if (!api) {
        return null;
      }

      api.startGame();
      api.setPaused(true);
      const base = api.getState();
      api.applyDebugConfig({
        ...base.debugConfig,
        performanceQualityPreset: 0,
        performanceAutoQualityEnabled: true,
        archivalKeepRecentLevels: 5,
        archivalChunkSize: 3,
        lodNearDistance: 4,
        lodFarDistance: 10,
        maxActiveDebris: 8,
        debrisPoolLimit: 16,
      });

      const outcomes = [0.8, -0.6, 0, 0.65, -0.5, 0].map((offset) => api.placeAtOffset(offset));
      api.stepSimulation(24);
      const state = api.getState();

      return {
        outcomes,
        score: state.score,
        level: state.level,
        integrityTier: state.integrity.tier,
        collapseTrigger: state.collapse.trigger,
        qualityPreset: state.performance.qualityPreset,
        archivedSlabs: state.performance.archivedSlabs,
      };
    });
  };

  const first = await runScript();
  const second = await runScript();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(first).toEqual(second);
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
