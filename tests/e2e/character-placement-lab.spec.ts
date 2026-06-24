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

  const spatialDebug = await page.evaluate(async () => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: { distractionsEnabled?: boolean }) => void;
        applyModelLabState: (state: { showSpatialHelpers?: boolean; forceTopFallback?: boolean }) => void;
        autoPlayUntilCharacter: (options?: {
          maxPlacements?: number;
          stepsPerPlacement?: number;
          placementOffset?: number;
        }) => Promise<{
          spatialDebug: {
            primaryCharacter: {
              characterId: string | null;
              anchor: {
                ledgeHeight: number | null;
                ledgeDepth: number | null;
                usableWidth: number | null;
                widthRatio: number | null;
                laneOffset: number | null;
                ledgeRotationYDegrees: number | null;
                relationToLedge: { x: number; y: number; z: number } | null;
                support: {
                  ledgeLocalBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
                  footprintLocalBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
                  margins: { left: number; right: number; back: number; front: number };
                  footprintCoverageRatio: number;
                  centerOnLedge: boolean;
                  footprintIntersectsLedge: boolean;
                  verticalGap: number;
                } | null;
              } | null;
              bounds: {
                min: { x: number; y: number; z: number };
                max: { x: number; y: number; z: number };
                center: { x: number; y: number; z: number };
              };
              helpers: {
                bottomContactPoint: { x: number; y: number; z: number };
              };
            } | null;
            secondaryCharacter: unknown;
          };
          testMode: { paused: boolean };
        }>;
      };
    }).__towerStackerTestApi;

    if (!api) {
      throw new Error("Test API unavailable");
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({ distractionsEnabled: false });
    api.applyModelLabState({
      showSpatialHelpers: true,
      forceTopFallback: false,
    });
    const state = await api.autoPlayUntilCharacter({ maxPlacements: 24, stepsPerPlacement: 12, placementOffset: 0 });
    if (!state.testMode.paused) {
      throw new Error("autoPlayUntilCharacter did not pause after finishing");
    }
    return state.spatialDebug;
  });

  const primary = spatialDebug?.primaryCharacter;
  expect(primary).toBeTruthy();
  expect(primary?.characterId).not.toBeNull();
  expect(spatialDebug?.secondaryCharacter).toBeNull();
  expect(primary?.anchor?.laneOffset).toBe(0);

  const relation = primary?.anchor?.relationToLedge;
  const support = primary?.anchor?.support;
  const rotationRadians = ((primary?.anchor?.ledgeRotationYDegrees ?? 0) * Math.PI) / 180;
  const lateralOffset = relation ? relation.x * Math.cos(rotationRadians) - relation.z * Math.sin(rotationRadians) : NaN;
  const outwardOffset = relation ? relation.x * Math.sin(rotationRadians) + relation.z * Math.cos(rotationRadians) : NaN;
  const ledgeDepth = primary?.anchor?.ledgeDepth ?? 0;
  const usableWidth = primary?.anchor?.usableWidth ?? 0;
  const expectedTopClearance = 0;

  expect(primary?.anchor?.widthRatio).toBeGreaterThan(0);
  expect(usableWidth).toBeGreaterThan(0);
  expect(lateralOffset).toBeCloseTo(0, 4);
  expect(outwardOffset).toBeGreaterThan(-ledgeDepth / 2);
  expect(outwardOffset).toBeLessThan(ledgeDepth / 2);
  expect(outwardOffset).toBeGreaterThan(ledgeDepth * 0.4);
  expect(relation?.y).toBeCloseTo(expectedTopClearance, 4);
  expect(primary?.helpers.bottomContactPoint.y).toBeCloseTo(primary?.bounds.min.y ?? NaN, 4);

  expect(support).toBeTruthy();
  expect(support?.centerOnLedge).toBe(true);
  expect(support?.footprintIntersectsLedge).toBe(true);
  expect(support?.verticalGap).toBeCloseTo(expectedTopClearance, 4);
  expect(support?.footprintCoverageRatio).toBeGreaterThanOrEqual(0.45);
  expect(support?.margins.left).toBeGreaterThanOrEqual(-0.08);
  expect(support?.margins.right).toBeGreaterThanOrEqual(-0.08);
  expect(support?.margins.back).toBeGreaterThanOrEqual(-0.28);
  expect(support?.margins.front).toBeGreaterThanOrEqual(-0.28);
});



for (const seed of [7, 42, 77, 123]) {
  test(`character ledge support validation covers the visible footprint for seed ${seed}`, async ({ page }) => {
    await page.goto(`/?debug&test&paused=1&seed=${seed}`);

    const spatialDebug = await page.evaluate(async () => {
      const api = (window as Window & {
        __towerStackerTestApi?: {
          startGame: () => void;
          setPaused: (paused: boolean) => void;
          applyDebugConfig: (config: { distractionsEnabled?: boolean }) => void;
          applyModelLabState: (state: { showSpatialHelpers?: boolean; forceTopFallback?: boolean }) => void;
          autoPlayUntilCharacter: (options?: {
            maxPlacements?: number;
            stepsPerPlacement?: number;
            placementOffset?: number;
          }) => Promise<{
            spatialDebug: {
              primaryCharacter: {
                role: "primary" | "secondary";
                characterId: string | null;
                anchor: {
                  support: {
                    margins: { left: number; right: number; back: number; front: number };
                    footprintCoverageRatio: number;
                    centerOnLedge: boolean;
                    footprintIntersectsLedge: boolean;
                    verticalGap: number;
                  } | null;
                  ledgeDepth: number | null;
                  usableWidth: number | null;
                } | null;
              } | null;
              secondaryCharacter: {
                role: "primary" | "secondary";
                characterId: string | null;
                anchor: {
                  support: {
                    margins: { left: number; right: number; back: number; front: number };
                    footprintCoverageRatio: number;
                    centerOnLedge: boolean;
                    footprintIntersectsLedge: boolean;
                    verticalGap: number;
                  } | null;
                  ledgeDepth: number | null;
                  usableWidth: number | null;
                } | null;
              } | null;
            };
          }>;
        };
      }).__towerStackerTestApi;

      if (!api) {
        throw new Error("Test API unavailable");
      }

      api.startGame();
      api.setPaused(true);
      api.applyDebugConfig({ distractionsEnabled: false });
      api.applyModelLabState({
        showSpatialHelpers: true,
        forceTopFallback: false,
      });
      return (await api.autoPlayUntilCharacter({ maxPlacements: 28, stepsPerPlacement: 12, placementOffset: 0 })).spatialDebug;
    });

    const characters = [spatialDebug.primaryCharacter, spatialDebug.secondaryCharacter].filter(
      (character): character is NonNullable<typeof character> => Boolean(character),
    );
    expect(characters.length).toBeGreaterThan(0);

    for (const character of characters) {
      const support = character.anchor?.support;
      expect(character.characterId).not.toBeNull();
      expect(character.anchor?.ledgeDepth).toBeGreaterThan(0);
      expect(character.anchor?.usableWidth).toBeGreaterThan(0);
      expect(support, `${character.role} support snapshot`).toBeTruthy();
      expect(support?.centerOnLedge, `${character.role} center on ledge`).toBe(true);
      expect(support?.footprintIntersectsLedge, `${character.role} footprint intersects ledge`).toBe(true);
      expect(support?.verticalGap, `${character.role} vertical gap`).toBeCloseTo(0, 4);
      expect(support?.footprintCoverageRatio, `${character.role} footprint coverage`).toBeGreaterThanOrEqual(0.45);
      expect(support?.margins.left, `${character.role} left margin`).toBeGreaterThanOrEqual(-0.08);
      expect(support?.margins.right, `${character.role} right margin`).toBeGreaterThanOrEqual(-0.08);
      expect(support?.margins.back, `${character.role} back margin`).toBeGreaterThanOrEqual(-0.28);
      expect(support?.margins.front, `${character.role} front margin`).toBeGreaterThanOrEqual(-0.28);
    }
  });
}
