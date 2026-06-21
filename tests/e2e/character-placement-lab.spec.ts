import { expect, test } from "@playwright/test";

test("character placement lab exposes deterministic transform snapshots and model-lab toggles", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyModelLabState: (state: { showSpatialHelpers?: boolean; forceTopFallback?: boolean }) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      throw new Error("Test API unavailable");
    }

    api.startGame();
    api.setPaused(true);
    api.applyModelLabState({
      showSpatialHelpers: true,
      forceTopFallback: true,
    });
  });

  await page.waitForFunction(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => {
          spatialDebug: {
            primaryCharacter: unknown;
          };
        };
      };
    }).__towerStackerTestApi;

    return Boolean(api?.getState().spatialDebug.primaryCharacter);
  });

  const snapshots = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        applyRemyDebugConfig: (config: {
          yawDegrees?: number;
          pitchDegrees?: number;
          rollDegrees?: number;
          translateX?: number;
          translateY?: number;
          translateZ?: number;
        }) => void;
        applyModelLabState: (state: { showSpatialHelpers?: boolean; forceTopFallback?: boolean }) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          modelLab: {
            enabled: boolean;
            showSpatialHelpers: boolean;
            forceTopFallback: boolean;
          };
          spatialDebug: {
            primaryCharacter: {
              worldPosition: { x: number; y: number; z: number };
              uniformScale: number;
              debugConfig: {
                yawDegrees: number;
                pitchDegrees: number;
                rollDegrees: number;
                translateX: number;
                translateY: number;
                translateZ: number;
              };
              bounds: {
                min: { x: number; y: number; z: number };
                max: { x: number; y: number; z: number };
                center: { x: number; y: number; z: number };
                size: { x: number; y: number; z: number };
              };
              helpers: {
                placementOrigin: { x: number; y: number; z: number };
                boundsCenter: { x: number; y: number; z: number };
                bottomContactPoint: { x: number; y: number; z: number };
              };
              nodes: {
                placementNode: {
                  worldPosition: { x: number; y: number; z: number };
                };
                scaleNode: {
                  localScale: { x: number; y: number; z: number };
                };
              };
              anchor: {
                ledgeRotationYDegrees: number | null;
              } | null;
            } | null;
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    const before = api.getState();
    api.applyRemyDebugConfig({
      yawDegrees: 12,
      pitchDegrees: -3,
      rollDegrees: 91,
      translateX: 0.3,
      translateY: 1.1,
      translateZ: 0.2,
    });
    const after = api.getState();
    api.stepSimulation(4);
    const afterStep = api.getState();

    return {
      before,
      after,
      afterStep,
      helpersCheckbox: document
        .querySelector<HTMLInputElement>("[data-testid='debug-toggle-spatial-helpers']")
        ?.checked,
      fallbackCheckbox: document
        .querySelector<HTMLInputElement>("[data-testid='debug-toggle-force-top-lab']")
        ?.checked,
    };
  });

  expect(snapshots).not.toBeNull();
  expect(snapshots!.before.modelLab).toEqual({
    enabled: true,
    showSpatialHelpers: true,
    forceTopFallback: true,
  });
  expect(snapshots!.helpersCheckbox).toBe(true);
  expect(snapshots!.fallbackCheckbox).toBe(true);

  const before = snapshots!.before.spatialDebug.primaryCharacter;
  const after = snapshots!.after.spatialDebug.primaryCharacter;
  const afterStep = snapshots!.afterStep.spatialDebug.primaryCharacter;

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(afterStep).not.toBeNull();

  expect(after!.debugConfig).toEqual({
    yawDegrees: 12,
    pitchDegrees: -3,
    rollDegrees: 91,
    translateX: 0.3,
    translateY: 1.1,
    translateZ: 0.2,
  });
  expect(after!.anchor?.ledgeRotationYDegrees).toBe(0);
  expect(after!.worldPosition.x - before!.worldPosition.x).toBeCloseTo(
    after!.debugConfig.translateX - before!.debugConfig.translateX,
    4,
  );
  expect(after!.worldPosition.y - before!.worldPosition.y).toBeCloseTo(
    after!.debugConfig.translateY - before!.debugConfig.translateY,
    4,
  );
  expect(after!.worldPosition.z - before!.worldPosition.z).toBeCloseTo(
    after!.debugConfig.translateZ - before!.debugConfig.translateZ,
    4,
  );

  expect(after!.helpers.placementOrigin).toEqual(after!.worldPosition);
  expect(after!.helpers.boundsCenter).toEqual(after!.bounds.center);
  expect(after!.helpers.bottomContactPoint.y).toBe(after!.bounds.min.y);
  expect(after!.helpers.bottomContactPoint.x).toBe(after!.bounds.center.x);
  expect(after!.helpers.bottomContactPoint.z).toBe(after!.bounds.center.z);
  expect(after!.bounds.size.y).toBeGreaterThan(0);
  expect(after!.nodes.scaleNode.localScale.x).toBe(after!.uniformScale);
  expect(after!.nodes.placementNode.worldPosition).toEqual(after!.worldPosition);

  expect(afterStep!.worldPosition).toEqual(after!.worldPosition);
  expect(afterStep!.uniformScale).toBe(after!.uniformScale);
  expect(afterStep!.debugConfig).toEqual(after!.debugConfig);
});

test("single loaded character stays centered when a wide ledge requests dual lanes", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: { distractionEnabled?: boolean }) => void;
        applyModelLabState: (state: { showSpatialHelpers?: boolean; forceTopFallback?: boolean }) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      throw new Error("Test API unavailable");
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({ distractionEnabled: false });
    api.applyModelLabState({
      showSpatialHelpers: true,
      forceTopFallback: false,
    });
  });

  const snapshot = await page.waitForFunction(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => unknown;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          spatialDebug: {
            primaryCharacter: {
              anchor: {
                ledgeDepth: number | null;
                laneOffset: number | null;
                ledgeRotationYDegrees: number | null;
                relationToLedge: { x: number; y: number; z: number } | null;
              } | null;
            } | null;
            secondaryCharacter: unknown;
          };
        };
      };
    }).__towerStackerTestApi;
    if (!api) {
      return null;
    }

    for (let index = 0; index < 16; index += 1) {
      api.placeAtOffset(0);
      api.stepSimulation(8);
      const state = api.getState();
      if (state.spatialDebug.primaryCharacter?.anchor?.relationToLedge) {
        return state.spatialDebug;
      }
    }

    return null;
  });

  const spatialDebug = await snapshot.jsonValue();
  const primary = spatialDebug?.primaryCharacter;
  expect(primary).toBeTruthy();
  expect(spatialDebug?.secondaryCharacter).toBeNull();
  expect(primary?.anchor?.laneOffset).toBe(0);

  const relation = primary?.anchor?.relationToLedge;
  const rotationRadians = ((primary?.anchor?.ledgeRotationYDegrees ?? 0) * Math.PI) / 180;
  const lateralOffset = relation ? relation.x * Math.cos(rotationRadians) - relation.z * Math.sin(rotationRadians) : NaN;
  const outwardOffset = relation ? relation.x * Math.sin(rotationRadians) + relation.z * Math.cos(rotationRadians) : NaN;
  expect(lateralOffset).toBeCloseTo(0, 4);
  expect(Math.abs(outwardOffset)).toBeLessThan((primary?.anchor?.ledgeDepth ?? 0) / 2);
});
