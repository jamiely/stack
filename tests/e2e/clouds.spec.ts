import { expect, test } from "@playwright/test";

type CloudSnapshot = {
  x: number;
  y: number;
  opacity: number;
  cloudId: string | null;
  lane: string | null;
  variant: string | null;
  laneClassApplied: boolean;
  variantClassApplied: boolean;
  lobeCount: number;
};

test("cloud layer renders and captures entry screenshots", async ({ page }, testInfo) => {
  await page.goto("/?debug&test&paused=0&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.locator('input[data-debug-key="distractionCloudStartLevel"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0";
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
    api.stepSimulation(2);
  });

  await page.getByTestId("debug-launch-clouds").click();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.placeAtOffset(0);
    api.placeAtOffset(0);
    api.stepSimulation(2);
  });

  const readClouds = async (): Promise<CloudSnapshot[]> =>
    page.locator(".distraction-cloud").evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
        const transform = element.style.transform;
        const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
        const lane = element.dataset.cloudLane ?? null;
        const variant = element.dataset.cloudVariant ?? null;
        return {
          x: match ? Number.parseFloat(match[1]) : Number.NaN,
          y: match ? Number.parseFloat(match[2]) : Number.NaN,
          opacity: Number.parseFloat(element.style.opacity || "1"),
          cloudId: element.dataset.cloudId ?? null,
          lane,
          variant,
          laneClassApplied: lane ? element.classList.contains(`distraction-cloud--lane-${lane}`) : false,
          variantClassApplied: variant ? element.classList.contains(`distraction-cloud--variant-${variant}`) : false,
          lobeCount: element.querySelectorAll(".distraction-cloud__lobe").length,
        };
      }),
    );

  const beforeClouds = await readClouds();
  const beforeVisible = beforeClouds.filter((cloud) => Number.isFinite(cloud.x) && Number.isFinite(cloud.y));
  expect(beforeVisible.length).toBeGreaterThan(0);
  beforeVisible.forEach((cloud) => {
    expect(cloud.cloudId).toMatch(/^cloud-/);
    expect(["front", "back"]).toContain(cloud.lane);
    expect(["0", "1", "2"]).toContain(cloud.variant);
    expect(cloud.laneClassApplied).toBe(true);
    expect(cloud.variantClassApplied).toBe(true);
    expect(cloud.lobeCount).toBeGreaterThanOrEqual(3);
  });

  const beforePath = testInfo.outputPath("cloud-entry-before.png");
  await page.screenshot({ path: beforePath, fullPage: true });
  await testInfo.attach("cloud-entry-before", { path: beforePath, contentType: "image/png" });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        placeAtOffset: (offset: number) => "landed" | "perfect" | "miss" | null;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.placeAtOffset(0);
    api.stepSimulation(12);
    api.placeAtOffset(0);
    api.stepSimulation(18);
  });

  const afterClouds = await readClouds();
  const afterVisible = afterClouds.filter((cloud) => Number.isFinite(cloud.x) && Number.isFinite(cloud.y));

  const afterPath = testInfo.outputPath("cloud-entry-after.png");
  await page.screenshot({ path: afterPath, fullPage: true });
  await testInfo.attach("cloud-entry-after", { path: afterPath, contentType: "image/png" });

  expect(afterVisible.length).toBeGreaterThan(0);
  afterVisible.forEach((cloud) => {
    expect(cloud.cloudId).toMatch(/^cloud-/);
    expect(["front", "back"]).toContain(cloud.lane);
    expect(["0", "1", "2"]).toContain(cloud.variant);
    expect(cloud.laneClassApplied).toBe(true);
    expect(cloud.variantClassApplied).toBe(true);
    expect(cloud.lobeCount).toBeGreaterThanOrEqual(3);
  });
});

test("cloud layer toggle off/on cleanly gates simulation mapping", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        stepSimulation: (steps?: number) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    api.applyDebugConfig({ distractionCloudStartLevel: 0, distractionCloudEnabled: true });
    api.stepSimulation(2);
  });

  const enabledSnapshot = await page.locator(".distraction-cloud").first().evaluate((node) => {
    const element = node as HTMLElement;
    const lane = element.dataset.cloudLane ?? null;
    const variant = element.dataset.cloudVariant ?? null;
    return {
      transform: element.style.transform,
      cloudId: element.dataset.cloudId ?? null,
      lane,
      variant,
      laneClassApplied: lane ? element.classList.contains(`distraction-cloud--lane-${lane}`) : false,
      variantClassApplied: variant ? element.classList.contains(`distraction-cloud--variant-${variant}`) : false,
      lobeCount: element.querySelectorAll(".distraction-cloud__lobe").length,
    };
  });

  expect(enabledSnapshot.cloudId).toMatch(/^cloud-/);
  expect(["front", "back"]).toContain(enabledSnapshot.lane);
  expect(["0", "1", "2"]).toContain(enabledSnapshot.variant);
  expect(enabledSnapshot.laneClassApplied).toBe(true);
  expect(enabledSnapshot.variantClassApplied).toBe(true);
  expect(enabledSnapshot.lobeCount).toBeGreaterThanOrEqual(3);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.applyDebugConfig({ distractionCloudEnabled: false });
    api.stepSimulation(1);
  });

  const disabledOpacity = await page.getByTestId("actor-clouds").evaluate((node) => (node as HTMLElement).style.opacity || "0");
  expect(Number.parseFloat(disabledOpacity)).toBe(0);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.applyDebugConfig({ distractionCloudEnabled: true });
    api.stepSimulation(2);
  });

  const reenabledSnapshot = await page.locator(".distraction-cloud").first().evaluate((node) => {
    const element = node as HTMLElement;
    const lane = element.dataset.cloudLane ?? null;
    const variant = element.dataset.cloudVariant ?? null;
    return {
      transform: element.style.transform,
      opacity: Number.parseFloat(element.style.opacity || "0"),
      cloudId: element.dataset.cloudId ?? null,
      lane,
      variant,
      laneClassApplied: lane ? element.classList.contains(`distraction-cloud--lane-${lane}`) : false,
      variantClassApplied: variant ? element.classList.contains(`distraction-cloud--variant-${variant}`) : false,
      lobeCount: element.querySelectorAll(".distraction-cloud__lobe").length,
    };
  });

  expect(reenabledSnapshot.cloudId).toMatch(/^cloud-/);
  expect(["front", "back"]).toContain(reenabledSnapshot.lane);
  expect(["0", "1", "2"]).toContain(reenabledSnapshot.variant);
  expect(reenabledSnapshot.laneClassApplied).toBe(true);
  expect(reenabledSnapshot.variantClassApplied).toBe(true);
  expect(reenabledSnapshot.lobeCount).toBeGreaterThanOrEqual(3);
  expect(reenabledSnapshot.transform.length).toBeGreaterThan(0);
  expect(reenabledSnapshot.opacity).toBeGreaterThan(0);
});

test("cloud debug controls apply on the next simulation step", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        stepSimulation: (steps?: number) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.startGame();
    (api as { setPaused?: (paused: boolean) => void }).setPaused?.(true);
    api.applyDebugConfig({
      distractionCloudStartLevel: 0,
      distractionCloudEnabled: true,
      distractionCloudCount: 2,
      distractionCloudDriftSpeed: 0,
    });
    api.stepSimulation(2);
  });

  const beforeUpdate = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".distraction-cloud"));
    return {
      count: nodes.length,
      firstTransform: nodes[0]?.style.transform ?? "",
    };
  });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.applyDebugConfig({
      distractionCloudCount: 9,
      distractionCloudDriftSpeed: -1.75,
      distractionCloudSpawnBandAbove: 1,
      distractionCloudDespawnBandBelow: 3,
    });
  });

  const beforeStep = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".distraction-cloud"));
    return {
      count: nodes.length,
      firstTransform: nodes[0]?.style.transform ?? "",
    };
  });

  expect(beforeStep.count).toBe(beforeUpdate.count);

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        stepSimulation: (steps?: number) => void;
        getState: () => { debugConfig: Record<string, number> };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return;
    }

    api.stepSimulation(1);
  });

  const afterStep = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        getState: () => { debugConfig: Record<string, number> };
      };
    }).__towerStackerTestApi;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".distraction-cloud"));

    return {
      count: nodes.length,
      firstTransform: nodes[0]?.style.transform ?? "",
      debugConfig: api?.getState().debugConfig ?? null,
    };
  });

  expect(afterStep.count).toBe(9);
  expect(afterStep.firstTransform.length).toBeGreaterThan(0);
  expect(afterStep.debugConfig).not.toBeNull();
  expect(afterStep.debugConfig!.distractionCloudSpawnBandAbove).toBeGreaterThanOrEqual(
    afterStep.debugConfig!.distractionCloudDespawnBandBelow + 0.5,
  );
});

test("test API exposes per-cloud diagnostics and stays stable under adversarial cloud thresholds", async ({ page }) => {
  await page.goto("/?debug&test&paused=1&seed=42");

  const first = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        startGame: () => void;
        setPaused: (paused: boolean) => void;
        applyDebugConfig: (config: Partial<Record<string, number | boolean>>) => void;
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            clouds?: Array<{
              id: string;
              x: number;
              y: number;
              z: number;
              lane: string;
              recycleCount: number;
            }>;
          };
          debugConfig: { distractionCloudSpawnBandAbove: number; distractionCloudDespawnBandBelow: number };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.startGame();
    api.setPaused(true);
    api.applyDebugConfig({
      distractionCloudEnabled: true,
      distractionCloudStartLevel: 0,
      distractionCloudCount: 12,
      distractionCloudDriftSpeed: 0,
      distractionCloudSpawnBandAbove: 0,
      distractionCloudDespawnBandBelow: 29.5,
    });
    api.stepSimulation(1);

    const state = api.getState();
    return {
      clouds: state.distractions.clouds ?? [],
      debugConfig: state.debugConfig,
    };
  });

  expect(first).not.toBeNull();
  expect(first!.clouds).toHaveLength(12);
  expect(first!.debugConfig.distractionCloudSpawnBandAbove).toBeGreaterThanOrEqual(
    first!.debugConfig.distractionCloudDespawnBandBelow + 0.5,
  );

  first!.clouds.forEach((cloud) => {
    expect(cloud.id).toMatch(/^cloud-/);
    expect(["front", "back"]).toContain(cloud.lane);
    expect(Number.isFinite(cloud.x)).toBe(true);
    expect(Number.isFinite(cloud.y)).toBe(true);
    expect(Number.isFinite(cloud.z)).toBe(true);
    expect(cloud.recycleCount).toBeGreaterThanOrEqual(0);
  });

  const second = await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        stepSimulation: (steps?: number) => void;
        getState: () => {
          distractions: {
            clouds?: Array<{
              id: string;
              x: number;
              y: number;
              z: number;
              lane: string;
              recycleCount: number;
            }>;
          };
        };
      };
    }).__towerStackerTestApi;

    if (!api) {
      return null;
    }

    api.stepSimulation(10);
    return api.getState().distractions.clouds ?? [];
  });

  expect(second).not.toBeNull();
  expect(second!).toHaveLength(12);
  second!.forEach((cloud, index) => {
    const baseline = first!.clouds[index];
    expect(baseline).toBeDefined();
    expect(cloud.id).toBe(baseline.id);
    expect(cloud.lane).toBe(baseline.lane);
    expect(cloud.recycleCount).toBe(baseline.recycleCount);
    expect(Number.isFinite(cloud.x)).toBe(true);
    expect(Number.isFinite(cloud.y)).toBe(true);
    expect(Number.isFinite(cloud.z)).toBe(true);
  });
});
