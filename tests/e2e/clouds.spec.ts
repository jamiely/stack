import { expect, test } from "@playwright/test";

type CloudSnapshot = {
  x: number;
  y: number;
  opacity: number;
};

test("top-spawned clouds move downward from the top edge", async ({ page }, testInfo) => {
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
        return {
          x: match ? Number.parseFloat(match[1]) : Number.NaN,
          y: match ? Number.parseFloat(match[2]) : Number.NaN,
          opacity: Number.parseFloat(element.style.opacity || "1"),
        };
      }),
    );

  let entry: { index: number; cloud: CloudSnapshot } | null = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const clouds = await readClouds();
    const index = clouds.findIndex((cloud) => Number.isFinite(cloud.y) && cloud.y < 260 && cloud.opacity < 0.995);
    if (index >= 0) {
      entry = { index, cloud: clouds[index] };
      break;
    }

    await page.evaluate(() => {
      const api = (window as Window & {
        __towerStackerTestApi?: { stepSimulation: (steps?: number) => void };
      }).__towerStackerTestApi;
      api?.stepSimulation(2);
    });
  }

  expect(entry).not.toBeNull();
  if (!entry) {
    return;
  }

  const beforePath = testInfo.outputPath("cloud-entry-before.png");
  await page.screenshot({ path: beforePath, fullPage: true });
  await testInfo.attach("cloud-entry-before", { path: beforePath, contentType: "image/png" });

  await page.evaluate(() => {
    const api = (window as Window & {
      __towerStackerTestApi?: {
        stepSimulation: (steps?: number) => void;
      };
    }).__towerStackerTestApi;

    api?.stepSimulation(40);
  });

  const afterClouds = await readClouds();
  const after = afterClouds[entry.index];

  const afterPath = testInfo.outputPath("cloud-entry-after.png");
  await page.screenshot({ path: afterPath, fullPage: true });
  await testInfo.attach("cloud-entry-after", { path: afterPath, contentType: "image/png" });

  expect(after).toBeDefined();
  expect(after.y).toBeGreaterThan(entry.cloud.y - 4);
  expect(after.opacity).toBeGreaterThanOrEqual(entry.cloud.opacity);
});
