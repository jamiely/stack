import { expect, test } from "@playwright/test";

test("fireworks config changes stay stable while paused until stepSimulation", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  const snapshots = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            fireworks?: {
              tick: number;
              launches: number;
              primaryBursts: number;
              secondaryBursts: number;
              cleanupEvents: number;
            };
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
      distractionFireworksStartLevel: 0,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 0.2,
    });

    const beforeApply = api.getState().distractions.fireworks;

    api.applyDebugConfig({
      distractionFireworksShellSpeedMin: 36,
      distractionFireworksShellSpeedMax: 36,
      distractionFireworksShellGravity: 48,
    });

    const afterApply = api.getState().distractions.fireworks;
    api.stepSimulation(1);
    const afterStep = api.getState().distractions.fireworks;

    return {
      beforeApply,
      afterApply,
      afterStep,
    };
  });

  expect(snapshots).not.toBeNull();
  expect(snapshots!.beforeApply).toBeDefined();
  expect(snapshots!.afterApply).toEqual(snapshots!.beforeApply);
  expect(snapshots!.afterStep?.tick ?? 0).toBeGreaterThan(snapshots!.beforeApply?.tick ?? 0);
});

test("fireworks morphology/count controls map through debug config and stay step-gated while paused", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  const snapshots = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            fireworks?: {
              tick: number;
              primaryBursts: number;
              activeParticles: number;
              maxActiveParticles: number;
            };
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
      distractionFireworksStartLevel: 0,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 0.2,
      distractionFireworksShellSpeedMin: 36,
      distractionFireworksShellSpeedMax: 36,
      distractionFireworksShellGravity: 48,
      distractionFireworksSecondaryDelayMinSeconds: 0.3,
      distractionFireworksSecondaryDelayMaxSeconds: 0.3,
      distractionFireworksParticleLifetimeMinSeconds: 1,
      distractionFireworksParticleLifetimeMaxSeconds: 1,
      distractionFireworksPrimaryParticleCount: 20,
      distractionFireworksSecondaryParticleCount: 12,
      distractionFireworksMaxActiveParticles: 240,
    });

    const beforeApply = api.getState().distractions.fireworks;

    api.applyDebugConfig({
      distractionFireworksPrimaryParticleCount: 40.9,
      distractionFireworksSecondaryParticleCount: 9.6,
      distractionFireworksMaxActiveParticles: 96.2,
      distractionFireworksRingBias: 0.75,
      distractionFireworksRadialJitter: 0.5,
      distractionFireworksVerticalBias: -0.25,
      distractionFireworksSpeedJitter: 0.4,
    });

    const afterApply = api.getState().distractions.fireworks;
    const debugValuePrimary = document
      .querySelector<HTMLElement>("[data-debug-value='distractionFireworksPrimaryParticleCount']")
      ?.textContent?.trim();
    const debugValueSecondary = document
      .querySelector<HTMLElement>("[data-debug-value='distractionFireworksSecondaryParticleCount']")
      ?.textContent?.trim();

    let burstSnapshot: {
      tick: number;
      primaryBursts: number;
      activeParticles: number;
      maxActiveParticles: number;
    } | null = null;

    for (let step = 0; step < 600; step += 1) {
      api.stepSimulation(1);
      const fireworks = api.getState().distractions.fireworks;
      if (!fireworks) {
        continue;
      }

      if (fireworks.primaryBursts > 0) {
        burstSnapshot = {
          tick: fireworks.tick,
          primaryBursts: fireworks.primaryBursts,
          activeParticles: fireworks.activeParticles,
          maxActiveParticles: fireworks.maxActiveParticles,
        };
        break;
      }
    }

    return {
      beforeApply,
      afterApply,
      burstSnapshot,
      debugValuePrimary,
      debugValueSecondary,
    };
  });

  expect(snapshots).not.toBeNull();
  expect(snapshots!.beforeApply).toBeDefined();
  expect(snapshots!.afterApply?.tick).toBe(snapshots!.beforeApply?.tick);
  expect(snapshots!.afterApply?.primaryBursts).toBe(snapshots!.beforeApply?.primaryBursts);
  expect(snapshots!.afterApply?.activeParticles).toBe(snapshots!.beforeApply?.activeParticles);
  expect(snapshots!.debugValuePrimary).toBe("41");
  expect(snapshots!.debugValueSecondary).toBe("10");
  expect(snapshots!.burstSnapshot).not.toBeNull();
  expect(snapshots!.burstSnapshot!.tick).toBeGreaterThan(snapshots!.beforeApply?.tick ?? 0);
  expect(snapshots!.burstSnapshot!.primaryBursts).toBeGreaterThan(0);
  expect(snapshots!.burstSnapshot!.activeParticles).toBe(41);
  expect(snapshots!.burstSnapshot!.maxActiveParticles).toBe(96);
});

test("public state exposes deterministic fireworks lifecycle counters", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  const lifecycle = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            fireworks?: {
              launches: number;
              primaryBursts: number;
              secondaryBursts: number;
              cleanupEvents: number;
              activeParticles: number;
              droppedSecondary: number;
              maxActiveParticles: number;
            };
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
      distractionFireworksStartLevel: 0,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 0.2,
      distractionFireworksShellSpeedMin: 36,
      distractionFireworksShellSpeedMax: 36,
      distractionFireworksShellGravity: 48,
      distractionFireworksSecondaryDelayMinSeconds: 0.05,
      distractionFireworksSecondaryDelayMaxSeconds: 0.1,
      distractionFireworksParticleLifetimeMinSeconds: 0.4,
      distractionFireworksParticleLifetimeMaxSeconds: 0.8,
      distractionFireworksMaxActiveParticles: 48,
    });

    let maxActiveParticles = 0;
    let launches = 0;
    let primaryBursts = 0;
    let secondaryBursts = 0;
    let cleanupEvents = 0;
    let droppedSecondary = 0;

    for (let step = 0; step < 360; step += 1) {
      api.stepSimulation(1);
      const fireworks = api.getState().distractions.fireworks;
      if (!fireworks) {
        continue;
      }

      maxActiveParticles = Math.max(maxActiveParticles, fireworks.activeParticles);
      launches = fireworks.launches;
      primaryBursts = fireworks.primaryBursts;
      secondaryBursts = fireworks.secondaryBursts;
      cleanupEvents = fireworks.cleanupEvents;
      droppedSecondary = fireworks.droppedSecondary;

      if (cleanupEvents > 0 && secondaryBursts > 0) {
        break;
      }
    }

    return {
      launches,
      primaryBursts,
      secondaryBursts,
      cleanupEvents,
      maxActiveParticles,
      droppedSecondary,
    };
  });

  expect(lifecycle).not.toBeNull();
  expect(lifecycle!.launches).toBeGreaterThan(0);
  expect(lifecycle!.primaryBursts).toBeGreaterThan(0);
  expect(lifecycle!.secondaryBursts).toBeGreaterThan(0);
  expect(lifecycle!.cleanupEvents).toBeGreaterThan(0);
  expect(lifecycle!.maxActiveParticles).toBeLessThanOrEqual(48);
  expect(lifecycle!.droppedSecondary).toBeGreaterThanOrEqual(0);
});

test("fireworks render nodes mirror simulation ids/stages and cleanup removes expired nodes", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
      };
    }).__towerStackerTestApi;

    api?.startGame();
    api?.setPaused(true);
    api?.applyDebugConfig({
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
      distractionFireworksStartLevel: 0,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 0.2,
      distractionFireworksShellSpeedMin: 40,
      distractionFireworksShellSpeedMax: 40,
      distractionFireworksShellGravity: 52,
      distractionFireworksSecondaryDelayMinSeconds: 0.05,
      distractionFireworksSecondaryDelayMaxSeconds: 0.05,
      distractionFireworksParticleLifetimeMinSeconds: 0.35,
      distractionFireworksParticleLifetimeMaxSeconds: 0.35,
      distractionFireworksMaxActiveParticles: 120,
    });
  });

  await page.getByTestId("debug-launch-fireworks").click();

  const reachedRenderableState = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: { fireworks?: { activeShells: number; activeParticles: number } };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return false;
    }

    for (let step = 0; step < 1200; step += 1) {
      api.stepSimulation(1);
      const fireworks = api.getState().distractions.fireworks;
      if (!fireworks) {
        continue;
      }

      if (fireworks.activeShells + fireworks.activeParticles > 0) {
        return true;
      }
    }

    return false;
  });

  expect(reachedRenderableState).toBe(true);

  const activeSnapshot = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => {
          distractions: { fireworks?: { activeShells: number; activeParticles: number } };
        };
      };
    }).__towerStackerTestApi;

    const fireworks = api?.getState().distractions.fireworks;
    const entities = Array.from(document.querySelectorAll<HTMLElement>(".distraction-fireworks__entity"));

    return {
      activeShells: fireworks?.activeShells ?? 0,
      activeParticles: fireworks?.activeParticles ?? 0,
      domCount: entities.length,
      shellKinds: entities.filter((node) => node.dataset.fireworksKind === "shell").length,
      particleStages: entities
        .filter((node) => node.dataset.fireworksKind === "particle")
        .map((node) => node.dataset.fireworksStage ?? ""),
      ids: entities.map((node) => node.dataset.fireworksEntityId ?? ""),
      shellIds: entities.map((node) => node.dataset.fireworksShellId ?? ""),
    };
  });

  expect(activeSnapshot.activeShells + activeSnapshot.activeParticles).toBeGreaterThan(0);
  expect(activeSnapshot.domCount).toBe(activeSnapshot.activeShells + activeSnapshot.activeParticles);
  expect(activeSnapshot.shellKinds).toBeGreaterThan(0);
  expect(activeSnapshot.ids.every((id) => id.length > 0)).toBe(true);
  expect(activeSnapshot.shellIds.every((id) => id.length > 0)).toBe(true);
  expect(activeSnapshot.particleStages.every((stage) => stage === "primary" || stage === "secondary")).toBe(true);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    api?.stepSimulation(900);
  });

  const cleanedSnapshot = await page.evaluate((previousIds) => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => {
          distractions: { fireworks?: { activeShells: number; activeParticles: number; cleanupEvents: number } };
        };
      };
    }).__towerStackerTestApi;

    const fireworks = api?.getState().distractions.fireworks;
    const remainingIds = Array.from(document.querySelectorAll<HTMLElement>(".distraction-fireworks__entity")).map(
      (node) => node.dataset.fireworksEntityId ?? "",
    );

    return {
      activeShells: fireworks?.activeShells ?? 0,
      activeParticles: fireworks?.activeParticles ?? 0,
      cleanupEvents: fireworks?.cleanupEvents ?? 0,
      remainingIds,
      staleIdsStillMounted: previousIds.filter((id) => remainingIds.includes(id)),
    };
  }, activeSnapshot.ids);

  expect(cleanedSnapshot.cleanupEvents).toBeGreaterThan(0);
  expect(cleanedSnapshot.activeShells + cleanedSnapshot.activeParticles).toBe(cleanedSnapshot.remainingIds.length);
  expect(cleanedSnapshot.staleIdsStillMounted).toHaveLength(0);
});

test("fireworks stress mode keeps cap bounded and degrades secondary emissions first", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  const stress = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            fireworks?: {
              activeParticles: number;
              maxActiveParticles: number;
              droppedSecondary: number;
              droppedPrimary: number;
              launches: number;
            };
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
      distractionFireworksStartLevel: 0,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 0.2,
      distractionFireworksShellSpeedMin: 36,
      distractionFireworksShellSpeedMax: 36,
      distractionFireworksShellGravity: 50,
      distractionFireworksSecondaryDelayMinSeconds: 0.05,
      distractionFireworksSecondaryDelayMaxSeconds: 0.05,
      distractionFireworksParticleLifetimeMinSeconds: 0.8,
      distractionFireworksParticleLifetimeMaxSeconds: 0.8,
      distractionFireworksMaxActiveParticles: 40,
    });

    let peakActive = 0;
    let launches = 0;
    let droppedSecondary = 0;
    let droppedPrimary = 0;
    const maxActiveParticles = api.getState().distractions.fireworks?.maxActiveParticles ?? 40;

    for (let step = 0; step < 1800; step += 1) {
      api.stepSimulation(1);
      const fireworks = api.getState().distractions.fireworks;
      if (!fireworks) {
        continue;
      }

      peakActive = Math.max(peakActive, fireworks.activeParticles);
      launches = fireworks.launches;
      droppedSecondary = fireworks.droppedSecondary;
      droppedPrimary = fireworks.droppedPrimary;
    }

    return {
      peakActive,
      maxActiveParticles,
      launches,
      droppedSecondary,
      droppedPrimary,
    };
  });

  expect(stress).not.toBeNull();
  expect(stress!.launches).toBeGreaterThan(0);
  expect(stress!.peakActive).toBeLessThanOrEqual(stress!.maxActiveParticles);
  expect(stress!.droppedSecondary).toBeGreaterThan(0);
  expect(stress!.droppedPrimary).toBe(0);
});
