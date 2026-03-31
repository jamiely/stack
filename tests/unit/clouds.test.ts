import { describe, expect, it } from "vitest";
import {
  initializeCloudState,
  resolveCloudSpawnNdcX,
  sanitizeCloudLifecycleBands,
  shouldRespawnCloud,
  stepCloudState,
  type CloudCameraFrame,
  type CloudSimulationConfig,
} from "../../src/game/logic/clouds";

const baseConfig: CloudSimulationConfig = {
  count: 4,
  horizontalDriftSpeed: 0,
  spawnBandAboveCamera: 4,
  despawnBandBelowCamera: 3,
  laneRatioFront: 0.5,
  laneDepthFront: 12,
  laneDepthBack: 24,
};

const baseCameraFrame: CloudCameraFrame = {
  viewTopY: 100,
  viewBottomY: 80,
  visibleWorldXMin: -10,
  visibleWorldXMax: 10,
};

describe("cloud logic", () => {
  it("respawns clouds that fall below the viewport", () => {
    expect(shouldRespawnCloud({ x: 0, y: 1.26, z: 0.3 })).toBe(true);
  });

  it("respawns clouds that move behind the camera", () => {
    expect(shouldRespawnCloud({ x: 0.2, y: 0.1, z: 1.11 })).toBe(true);
  });

  it("does not respawn clouds only because they are far left/right", () => {
    expect(shouldRespawnCloud({ x: 2.8, y: 0.2, z: 0.4 })).toBe(false);
    expect(shouldRespawnCloud({ x: -2.8, y: -0.2, z: 0.4 })).toBe(false);
  });

  it("maps spawn noise across the full horizontal NDC range", () => {
    expect(resolveCloudSpawnNdcX(0)).toBeCloseTo(-0.95, 6);
    expect(resolveCloudSpawnNdcX(0.5)).toBeCloseTo(0, 6);
    expect(resolveCloudSpawnNdcX(1)).toBeCloseTo(0.95, 6);
  });

  it("clamps spawn noise before mapping", () => {
    expect(resolveCloudSpawnNdcX(-5)).toBeCloseTo(-0.95, 6);
    expect(resolveCloudSpawnNdcX(9)).toBeCloseTo(0.95, 6);
  });
});

describe("cloud simulation state", () => {
  it("initializes deterministically for the same seed", () => {
    const first = initializeCloudState({ seed: 42, config: baseConfig, cameraFrame: baseCameraFrame });
    const second = initializeCloudState({ seed: 42, config: baseConfig, cameraFrame: baseCameraFrame });

    expect(first).toEqual(second);
  });

  it("varies at least one cloud across different seeds", () => {
    const first = initializeCloudState({ seed: 1, config: baseConfig, cameraFrame: baseCameraFrame });
    const second = initializeCloudState({ seed: 2, config: baseConfig, cameraFrame: baseCameraFrame });

    expect(first.clouds).toHaveLength(baseConfig.count);
    expect(second.clouds).toHaveLength(baseConfig.count);
    expect(first.clouds.some((cloud, index) => {
      const other = second.clouds[index];
      return cloud.x !== other.x || cloud.y !== other.y || cloud.z !== other.z || cloud.lane !== other.lane;
    })).toBe(true);
  });

  it("creates unique ids and finite coordinates", () => {
    const state = initializeCloudState({ seed: 777, config: baseConfig, cameraFrame: baseCameraFrame });
    const ids = new Set(state.clouds.map((cloud) => cloud.id));

    expect(ids.size).toBe(state.clouds.length);
    for (const cloud of state.clouds) {
      expect(Number.isFinite(cloud.x)).toBe(true);
      expect(Number.isFinite(cloud.y)).toBe(true);
      expect(Number.isFinite(cloud.z)).toBe(true);
    }
  });

  it("steps deterministically from the same prior snapshot", () => {
    const initial = initializeCloudState({ seed: 99, config: baseConfig, cameraFrame: baseCameraFrame });

    const firstStep = stepCloudState({
      previousState: initial,
      config: baseConfig,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 1 / 60,
    });
    const secondStep = stepCloudState({
      previousState: initial,
      config: baseConfig,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 1 / 60,
    });

    expect(firstStep).toEqual(secondStep);
  });

  it("does not recycle before crossing the despawn threshold", () => {
    const config: CloudSimulationConfig = {
      ...baseConfig,
      spawnBandAboveCamera: 6,
      despawnBandBelowCamera: 4,
    };
    const initial = initializeCloudState({ seed: 1234, config, cameraFrame: baseCameraFrame });
    const cloud = initial.clouds[0];
    const thresholdY = baseCameraFrame.viewBottomY - config.despawnBandBelowCamera;

    const anchoredCloudY = thresholdY + 0.25;
    const nextState = stepCloudState({
      previousState: {
        ...initial,
        clouds: [
          {
            ...cloud,
            y: anchoredCloudY,
            recycleCount: 0,
          },
        ],
      },
      config,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 1 / 60,
    });

    expect(nextState.clouds[0].recycleCount).toBe(0);
    expect(nextState.clouds[0].y).toBeCloseTo(anchoredCloudY, 6);
  });

  it("recycles after threshold crossing into the spawn-above band", () => {
    const config: CloudSimulationConfig = {
      ...baseConfig,
      spawnBandAboveCamera: 5,
      despawnBandBelowCamera: 3,
    };
    const initial = initializeCloudState({ seed: 5678, config, cameraFrame: baseCameraFrame });
    const cloud = initial.clouds[0];
    const thresholdY = baseCameraFrame.viewBottomY - config.despawnBandBelowCamera;

    const previousState = {
      ...initial,
      clouds: [
        {
          ...cloud,
          y: thresholdY - 0.001,
          recycleCount: 0,
        },
      ],
    };

    const nextState = stepCloudState({
      previousState,
      config,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 1 / 60,
    });

    const recycled = nextState.clouds[0];
    expect(recycled.recycleCount).toBe(1);
    expect(recycled.y).toBeGreaterThanOrEqual(baseCameraFrame.viewTopY);
    expect(recycled.y).toBeLessThanOrEqual(baseCameraFrame.viewTopY + config.spawnBandAboveCamera);
  });

  it("replays recycle transitions deterministically across fixed steps", () => {
    const config: CloudSimulationConfig = {
      ...baseConfig,
      count: 1,
      spawnBandAboveCamera: 3,
      despawnBandBelowCamera: 2,
    };

    const runSequence = () => {
      let state = initializeCloudState({ seed: 999, config, cameraFrame: baseCameraFrame });
      state = {
        ...state,
        clouds: [
          {
            ...state.clouds[0],
            y: baseCameraFrame.viewBottomY - config.despawnBandBelowCamera - 0.01,
          },
        ],
      };

      for (let index = 0; index < 3; index += 1) {
        state = stepCloudState({
          previousState: state,
          config,
          cameraFrame: baseCameraFrame,
          deltaSeconds: 1 / 60,
        });
      }

      return state;
    };

    const first = runSequence();
    const second = runSequence();

    expect(first).toEqual(second);
    expect(first.clouds[0].recycleCount).toBeGreaterThanOrEqual(1);
  });

  it("keeps a deterministic front/back lane mix when count supports both lanes", () => {
    const config: CloudSimulationConfig = {
      ...baseConfig,
      count: 6,
      laneRatioFront: 1,
    };

    const first = initializeCloudState({ seed: 31337, config, cameraFrame: baseCameraFrame });
    const second = initializeCloudState({ seed: 31337, config, cameraFrame: baseCameraFrame });
    const firstLanes = new Set(first.clouds.map((cloud) => cloud.lane));
    const secondLanes = new Set(second.clouds.map((cloud) => cloud.lane));

    expect(first).toEqual(second);
    expect(firstLanes.has("front")).toBe(true);
    expect(firstLanes.has("back")).toBe(true);
    expect(secondLanes.has("front")).toBe(true);
    expect(secondLanes.has("back")).toBe(true);
  });

  it("preserves lane on recycle while applying lane depth for both lanes", () => {
    const config: CloudSimulationConfig = {
      ...baseConfig,
      count: 2,
      laneRatioFront: 0.5,
      laneDepthFront: 8,
      laneDepthBack: 18,
      despawnBandBelowCamera: 2,
    };
    const initial = initializeCloudState({ seed: 4242, config, cameraFrame: baseCameraFrame });
    const thresholdY = baseCameraFrame.viewBottomY - config.despawnBandBelowCamera;

    const forcedRecycle = {
      ...initial,
      clouds: initial.clouds.map((cloud) => ({
        ...cloud,
        y: thresholdY - 0.001,
      })),
    };

    const stepped = stepCloudState({
      previousState: forcedRecycle,
      config,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 1 / 60,
    });

    for (const cloud of stepped.clouds) {
      const baseline = initial.clouds.find((entry) => entry.id === cloud.id);
      expect(baseline).toBeDefined();
      expect(cloud.lane).toBe(baseline?.lane);
      expect(cloud.z).toBeCloseTo(cloud.lane === "front" ? config.laneDepthFront : config.laneDepthBack, 6);
    }
  });

  it("applies signed horizontal drift and keeps x static in zero-drift mode", () => {
    const driftingConfig: CloudSimulationConfig = {
      ...baseConfig,
      horizontalDriftSpeed: -3,
      despawnBandBelowCamera: 200,
    };
    const driftingInitial = initializeCloudState({ seed: 202, config: driftingConfig, cameraFrame: baseCameraFrame });
    const driftingStepped = stepCloudState({
      previousState: driftingInitial,
      config: driftingConfig,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 0.5,
    });

    driftingStepped.clouds.forEach((cloud, index) => {
      expect(cloud.x).toBeCloseTo(driftingInitial.clouds[index].x + driftingConfig.horizontalDriftSpeed * 0.5, 6);
      expect(cloud.x).toBeLessThan(driftingInitial.clouds[index].x);
    });

    const staticConfig: CloudSimulationConfig = {
      ...baseConfig,
      horizontalDriftSpeed: 0,
      despawnBandBelowCamera: 200,
    };
    const staticInitial = initializeCloudState({ seed: 203, config: staticConfig, cameraFrame: baseCameraFrame });
    const staticStepped = stepCloudState({
      previousState: staticInitial,
      config: staticConfig,
      cameraFrame: baseCameraFrame,
      deltaSeconds: 0.5,
    });

    staticStepped.clouds.forEach((cloud, index) => {
      expect(cloud.x).toBeCloseTo(staticInitial.clouds[index].x, 6);
    });
  });
});

describe("cloud lifecycle sanitization", () => {
  it("normalizes inverted and non-finite threshold bands", () => {
    const sanitized = sanitizeCloudLifecycleBands({
      spawnBandAboveCamera: -5,
      despawnBandBelowCamera: Number.NaN,
      minimumSeparation: 1,
    });

    expect(Number.isFinite(sanitized.spawnBandAboveCamera)).toBe(true);
    expect(Number.isFinite(sanitized.despawnBandBelowCamera)).toBe(true);
    expect(sanitized.spawnBandAboveCamera).toBeGreaterThanOrEqual(0);
    expect(sanitized.despawnBandBelowCamera).toBeGreaterThanOrEqual(0);
  });

  it("enforces minimum separation between effective despawn and spawn thresholds", () => {
    const sanitized = sanitizeCloudLifecycleBands({
      spawnBandAboveCamera: 0.25,
      despawnBandBelowCamera: 0,
      minimumSeparation: 1.5,
    });

    expect(sanitized.spawnBandAboveCamera - sanitized.despawnBandBelowCamera).toBeGreaterThanOrEqual(1.5);
  });
});
