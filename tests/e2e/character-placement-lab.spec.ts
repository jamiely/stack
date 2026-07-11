import { expect, test } from "@playwright/test";

const MAX_INTENTIONAL_LEDGE_SINK = 0.16;
const MAX_AMY_VISUAL_CONTACT_SINK = MAX_INTENTIONAL_LEDGE_SINK;

function maxIntentionalSinkForCharacter(characterId: string | null | undefined): number {
  return characterId === "amy" ? MAX_AMY_VISUAL_CONTACT_SINK : MAX_INTENTIONAL_LEDGE_SINK;
}

function outwardRatioRangeForCharacter(_characterId: string | null | undefined): { min: number; max: number } {
  return { min: 0.14, max: 0.22 };
}

function expectSupportedVertically(
  support: { verticalGap: number; topSurfaceVerticalGap: number; penetratesLedgeTop: boolean } | null | undefined,
  label: string,
  maxIntentionalSink = MAX_INTENTIONAL_LEDGE_SINK,
): void {
  const verticalGap = support?.verticalGap ?? Number.POSITIVE_INFINITY;
  const topSurfaceVerticalGap = support?.topSurfaceVerticalGap ?? Number.POSITIVE_INFINITY;

  // Character meshes can need model-space sink so the rendered feet read planted.
  // Keep the check one-sided against floating, but bound sink per character so it
  // cannot hide a model that has slipped to the ledge/floor below.
  expect(verticalGap, `${label} vertical gap`).toBeLessThanOrEqual(0.001);
  expect(verticalGap, `${label} vertical sink`).toBeGreaterThanOrEqual(-maxIntentionalSink);
  expect(topSurfaceVerticalGap, `${label} top-surface vertical gap`).toBeLessThanOrEqual(0.001);
  expect(topSurfaceVerticalGap, `${label} top-surface vertical sink`).toBeGreaterThanOrEqual(-maxIntentionalSink);
  expect(support?.penetratesLedgeTop, `${label} ledge top penetration flag`).toBe(topSurfaceVerticalGap < -0.005);
}

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
    overheadInspectionView: false,
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

test("overhead ledge inspection keeps every character supported and visibly clear of the wall", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.addStyleTag({ content: ".hud, .debug-panel, .overlay { display: none !important; }" });

  const characterIds = ["remy", "timmy", "amy", "aj"] as const;
  const targetFaces = ["posZ", "posX"] as const;
  const records: Array<{
    seed: number;
    characterId: (typeof characterIds)[number];
    faceId: (typeof targetFaces)[number];
    support: {
      ledgeLocalBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
      footprintLocalBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
      margins: { left: number; right: number; back: number; front: number };
      centerOnLedge: boolean;
      footprintIntersectsLedge: boolean;
      verticalGap: number;
      topSurfaceVerticalGap: number;
      penetratesLedgeTop: boolean;
    };
  }> = [];

  async function captureFaceForSeed(characterId: (typeof characterIds)[number], seed: number) {
    await page.goto(`/?debug&test&paused=1&seed=${seed}`);
    await page.waitForFunction(() => Boolean(window.__towerStackerTestApi));
    await page.addStyleTag({ content: ".hud, .debug-panel, .overlay { display: none !important; }" });

    await page.evaluate(async ({ characterId }) => {
      const api = window.__towerStackerTestApi;
      if (!api) {
        throw new Error("Test API unavailable");
      }

      api.startGame();
      api.setPaused(true);
      api.applyDebugConfig({ distractionsEnabled: false });
      api.applyModelLabState({ showSpatialHelpers: false, forceTopFallback: false, overheadInspectionView: false });
      await api.autoPlayUntilCharacter({ maxPlacements: 40, stepsPerPlacement: 14, placementOffset: 0 });
      await api.loadCharacterPair(characterId, null);
      await new Promise((resolve) => window.setTimeout(resolve, 20));
      api.applyModelLabState({ overheadInspectionView: true });
      api.applyPlacementDebugMaterials();
    }, { characterId });

    return page.evaluate(() => {
      const api = window.__towerStackerTestApi;
      if (!api) {
        throw new Error("Test API unavailable");
      }
      api.applyPlacementDebugMaterials();
      const character = api.getState().spatialDebug.primaryCharacter;
      return {
        actualCharacterId: character?.characterId ?? "unknown",
        faceId: character?.anchor?.faceId ?? null,
        support: character?.anchor?.support ?? null,
      };
    });
  }

  const candidateSeeds = [1, 7, 8, 9, 15, 19, 25, 32, 34];
  for (const characterId of characterIds) {
    const capturedFaces = new Set<string>();

    for (const seed of candidateSeeds) {
      if (capturedFaces.size >= targetFaces.length) {
        break;
      }

      const { actualCharacterId, faceId, support } = await captureFaceForSeed(characterId, seed);
      expect(actualCharacterId).toBe(characterId);
      if (faceId !== "posX" && faceId !== "posZ") {
        continue;
      }
      if (capturedFaces.has(faceId)) {
        continue;
      }
      expect(support, `${characterId} seed ${seed} ${faceId} support snapshot`).toBeTruthy();

      records.push({ seed, characterId, faceId, support: support! });
      capturedFaces.add(faceId);
    }

    for (const faceId of targetFaces) {
      expect(
        records.some((record) => record.characterId === characterId && record.faceId === faceId),
        `${characterId} ${faceId === "posX" ? "right-side posX" : "front posZ"} ledge case captured`,
      ).toBe(true);
    }
  }

  expect(records).toHaveLength(characterIds.length * targetFaces.length);

  for (const record of records) {
    const { footprintLocalBounds, ledgeLocalBounds, margins } = record.support;
    const outwardRatioRange = outwardRatioRangeForCharacter(record.characterId);
    const footprintCenterX = (footprintLocalBounds.minX + footprintLocalBounds.maxX) / 2;
    const footprintCenterZ = (footprintLocalBounds.minZ + footprintLocalBounds.maxZ) / 2;
    const ledgeWidth = ledgeLocalBounds.maxX - ledgeLocalBounds.minX;
    const ledgeDepth = ledgeLocalBounds.maxZ - ledgeLocalBounds.minZ;

    expect(Math.abs(footprintCenterX), `${record.characterId} seed ${record.seed} ${record.faceId} ledge-local overhead X center`).toBeLessThanOrEqual(
      ledgeWidth * 0.04,
    );
    expect(footprintCenterZ, `${record.characterId} seed ${record.seed} ${record.faceId} outward ledge-depth bias`).toBeGreaterThanOrEqual(
      ledgeDepth * outwardRatioRange.min,
    );
    expect(footprintCenterZ, `${record.characterId} seed ${record.seed} ${record.faceId} front-edge safety`).toBeLessThanOrEqual(
      ledgeDepth * outwardRatioRange.max,
    );
    expect(Math.abs(margins.left - margins.right), `${record.characterId} seed ${record.seed} ${record.faceId} equal left/right ledge margins`).toBeLessThanOrEqual(0.24);
    expect(margins.back - margins.front, `${record.characterId} seed ${record.seed} ${record.faceId} visible wall clearance`).toBeGreaterThanOrEqual(
      ledgeDepth * 0.25,
    );
    expect(margins.front, `${record.characterId} seed ${record.seed} ${record.faceId} visible front support`).toBeGreaterThanOrEqual(0.15);
    expect(record.support.centerOnLedge, `${record.characterId} seed ${record.seed} ${record.faceId} centered on ledge`).toBe(true);
    expect(record.support.footprintIntersectsLedge, `${record.characterId} seed ${record.seed} ${record.faceId} footprint intersects ledge`).toBe(true);
    expectSupportedVertically(
      record.support,
      `${record.characterId} seed ${record.seed} ${record.faceId}`,
      maxIntentionalSinkForCharacter(record.characterId),
    );
  }
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
                  ledgeTopY: number;
                  topSurfaceVerticalGap: number;
                  penetratesLedgeTop: boolean;
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
  const outwardRatioRange = outwardRatioRangeForCharacter(primary?.characterId);


  expect(primary?.anchor?.widthRatio).toBeGreaterThan(0);
  expect(usableWidth).toBeGreaterThan(0);
  // The logical single-character lane remains centered via laneOffset=0; model-space
  // rendering offsets may intentionally shift the visible bounds laterally so feet/body
  // read as supported on the ledge.
  expect(Math.abs(lateralOffset)).toBeLessThanOrEqual(usableWidth / 2);
  expect(outwardOffset).toBeGreaterThan(-ledgeDepth / 2);
  expect(outwardOffset).toBeLessThan(ledgeDepth / 2);
  expect(outwardOffset).toBeGreaterThanOrEqual(ledgeDepth * outwardRatioRange.min);
  expect(outwardOffset).toBeLessThanOrEqual(ledgeDepth * outwardRatioRange.max);
  expect(relation?.y).toBeLessThanOrEqual(0.001);
  expect(relation?.y).toBeGreaterThanOrEqual(-maxIntentionalSinkForCharacter(primary?.characterId));
  expect(primary?.helpers.bottomContactPoint.y).toBeCloseTo(primary?.bounds.min.y ?? NaN, 4);

  expect(support).toBeTruthy();
  expect(support?.centerOnLedge).toBe(true);
  expect(support?.footprintIntersectsLedge).toBe(true);
  expectSupportedVertically(support, "primary", maxIntentionalSinkForCharacter(primary?.characterId));
  expect(support?.ledgeTopY).toBeCloseTo(
    (primary?.helpers.bottomContactPoint.y ?? NaN) - (support?.topSurfaceVerticalGap ?? NaN),
    4,
  );
  expect(support?.footprintCoverageRatio).toBeGreaterThanOrEqual(0.99);
  expect(support?.margins.left).toBeGreaterThanOrEqual(0);
  expect(support?.margins.right).toBeGreaterThanOrEqual(0);
  expect(support?.margins.back).toBeGreaterThanOrEqual(0);
  expect(support?.margins.front).toBeGreaterThanOrEqual(0);
});
test("single Amy and AJ footprints stay horizontally centered and visibly clear of the wall", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=8");
  await page.waitForFunction(() => Boolean(window.__towerStackerTestApi));

  const records = await page.evaluate(async () => {
    const api = window.__towerStackerTestApi;
    if (!api) {
      throw new Error("Test API unavailable");
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({ distractionsEnabled: false });
    api.applyModelLabState({ showSpatialHelpers: true, forceTopFallback: false });
    await api.autoPlayUntilCharacter({ maxPlacements: 40, stepsPerPlacement: 14, placementOffset: 0 });

    const characterIds = ["amy", "aj"];
    const snapshots = [];
    for (const characterId of characterIds) {
      await api.loadCharacterPair(characterId, null);
      api.stepSimulation(6);
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      snapshots.push({ characterId, character: api.getState().spatialDebug.primaryCharacter });
    }
    return snapshots;
  });

  expect(records.length).toBe(2);
  for (const record of records) {
    const support = record.character?.anchor?.support;
    const footprintLocalBounds = support?.footprintLocalBounds;
    const ledgeLocalBounds = support?.ledgeLocalBounds;
    const footprintCenterX = footprintLocalBounds ? (footprintLocalBounds.minX + footprintLocalBounds.maxX) / 2 : Number.NaN;
    const footprintCenterZ = footprintLocalBounds ? (footprintLocalBounds.minZ + footprintLocalBounds.maxZ) / 2 : Number.NaN;
    const ledgeHalfWidth = ledgeLocalBounds ? (ledgeLocalBounds.maxX - ledgeLocalBounds.minX) / 2 : Number.NaN;
    const ledgeHalfDepth = ledgeLocalBounds ? (ledgeLocalBounds.maxZ - ledgeLocalBounds.minZ) / 2 : Number.NaN;
    const outwardRatioRange = outwardRatioRangeForCharacter(record.characterId);
    expect(support, `${record.characterId} support snapshot`).toBeTruthy();
    expect(Math.abs(footprintCenterX), `${record.characterId} horizontal ledge centering`).toBeLessThanOrEqual(
      Math.min(0.2, ledgeHalfWidth * 0.08),
    );
    expect(support?.margins.back, `${record.characterId} visible wall-side shelf margin`).toBeGreaterThanOrEqual(0.18);
    expect(support?.margins.front, `${record.characterId} visible front shelf margin`).toBeGreaterThanOrEqual(0.18);
    expect(footprintCenterZ, `${record.characterId} outward ledge-depth bias`).toBeGreaterThanOrEqual(ledgeHalfDepth * outwardRatioRange.min * 2);
    expect(footprintCenterZ, `${record.characterId} front-edge safety`).toBeLessThanOrEqual(ledgeHalfDepth * outwardRatioRange.max * 2);
    if (record.characterId === "aj") {
      expect(support?.margins.front, `${record.characterId} front ledge margin`).toBeGreaterThanOrEqual(0.3);
    }
    expect(support?.footprintCoverageRatio, `${record.characterId} footprint coverage`).toBeGreaterThanOrEqual(0.99);
    expect(support?.margins.left, `${record.characterId} left margin`).toBeGreaterThanOrEqual(0);
    expect(support?.margins.right, `${record.characterId} right margin`).toBeGreaterThanOrEqual(0);
  }
});

test("scripted mobile placements validate every character model footprint", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?test&paused=1&seed=42");
  await page.waitForFunction(() => Boolean(window.__towerStackerTestApi));

  const records = await page.evaluate(async () => {
    const api = window.__towerStackerTestApi;
    if (!api) {
      throw new Error("Test API unavailable");
    }

    api.applyDebugConfig({ distractionsEnabled: false });
    api.applyModelLabState({ showSpatialHelpers: false, forceTopFallback: false });

    for (let placementIndex = 0; placementIndex < 8; placementIndex += 1) {
      api.placeAtOffset(0);
      api.stepSimulation(8);
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }

    const characterPairs = [
      ["remy", "timmy"],
      ["timmy", "amy"],
      ["amy", "aj"],
      ["aj", "remy"],
    ];
    const snapshots = [];
    for (const [primaryId, secondaryId] of characterPairs) {
      await api.loadCharacterPair(primaryId, secondaryId);
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      snapshots.push({ scenario: `${primaryId}+${secondaryId}`, state: api.getState() });
    }

    return snapshots;
  });

  const visibleCharacters = records.flatMap((record) => [
    { scenario: record.scenario, character: record.state.spatialDebug.primaryCharacter },
    { scenario: record.scenario, character: record.state.spatialDebug.secondaryCharacter },
  ].filter((entry) => Boolean(entry.character)));
  expect(visibleCharacters.length).toBeGreaterThanOrEqual(8);

  for (const { scenario, character } of visibleCharacters) {
    const support = character?.anchor?.support;
    const label = `${scenario}: ${character?.characterId} ${character?.role} at level ${character?.anchor?.level}`;
    expectSupportedVertically(support, label, maxIntentionalSinkForCharacter(character?.characterId));
    expect(support?.footprintCoverageRatio, `${label} footprint coverage`).toBeGreaterThanOrEqual(0.99);
    expect(support?.margins.left, `${label} left margin`).toBeGreaterThanOrEqual(0);
    expect(support?.margins.right, `${label} right margin`).toBeGreaterThanOrEqual(0);
    expect(support?.margins.back, `${label} back margin`).toBeGreaterThanOrEqual(0);
    expect(support?.margins.front, `${label} front margin`).toBeGreaterThanOrEqual(0);
    const laneOffset = Math.abs(character?.anchor?.laneOffset ?? 0);
    const usableWidth = character?.anchor?.usableWidth ?? 0;
    if (usableWidth > 0) {
      expect(laneOffset, `${label} apparent ledge-end inset`).toBeLessThanOrEqual(usableWidth * 0.18 + 0.001);
    }
  }
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
                    ledgeTopY: number;
                    topSurfaceVerticalGap: number;
                    penetratesLedgeTop: boolean;
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
                    ledgeTopY: number;
                    topSurfaceVerticalGap: number;
                    penetratesLedgeTop: boolean;
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
      expectSupportedVertically(support, character.role, maxIntentionalSinkForCharacter(character.characterId));
      expect(support?.footprintCoverageRatio, `${character.role} footprint coverage`).toBeGreaterThanOrEqual(0.99);
      expect(support?.margins.left, `${character.role} left margin`).toBeGreaterThanOrEqual(0);
      expect(support?.margins.right, `${character.role} right margin`).toBeGreaterThanOrEqual(0);
      expect(support?.margins.back, `${character.role} back margin`).toBeGreaterThanOrEqual(0);
      expect(support?.margins.front, `${character.role} front margin`).toBeGreaterThanOrEqual(0);
    }
  });
}
