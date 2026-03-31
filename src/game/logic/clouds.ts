import { createSeededRandom } from "./random";

const MIN_CLOUD_LIFECYCLE_SEPARATION = 0.5;

export interface CloudProjectedPoint {
  x: number;
  y: number;
  z: number;
}

export type CloudLane = "front" | "back";

export interface CloudEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  lane: CloudLane;
  styleVariant: number;
  recycleCount: number;
}

export interface CloudSimulationConfig {
  count: number;
  horizontalDriftSpeed: number;
  spawnBandAboveCamera: number;
  despawnBandBelowCamera: number;
  laneRatioFront: number;
  laneDepthFront: number;
  laneDepthBack: number;
}

export interface CloudCameraFrame {
  viewTopY: number;
  viewBottomY: number;
  visibleWorldXMin: number;
  visibleWorldXMax: number;
}

export interface CloudState {
  tick: number;
  seed: number;
  clouds: CloudEntity[];
}

export interface InitializeCloudStateInput {
  seed: number;
  config: CloudSimulationConfig;
  cameraFrame: CloudCameraFrame;
}

export interface StepCloudStateInput {
  previousState: CloudState;
  config: CloudSimulationConfig;
  cameraFrame: CloudCameraFrame;
  deltaSeconds: number;
}

export interface CloudLifecycleBandsInput {
  spawnBandAboveCamera: number;
  despawnBandBelowCamera: number;
  minimumSeparation?: number;
}

export interface SanitizedCloudLifecycleBands {
  spawnBandAboveCamera: number;
  despawnBandBelowCamera: number;
}

export function initializeCloudState({ seed, config, cameraFrame }: InitializeCloudStateInput): CloudState {
  const random = createSeededRandom(seed);
  const count = clampCount(config.count);
  const cloudSpanY = Math.max(1, Math.abs(cameraFrame.viewTopY - cameraFrame.viewBottomY));
  const lifecycleBands = sanitizeCloudLifecycleBands({
    spawnBandAboveCamera: config.spawnBandAboveCamera,
    despawnBandBelowCamera: config.despawnBandBelowCamera,
    minimumSeparation: MIN_CLOUD_LIFECYCLE_SEPARATION,
  });
  const yMin = cameraFrame.viewBottomY;
  const yMax = cameraFrame.viewTopY + lifecycleBands.spawnBandAboveCamera + cloudSpanY;
  const xMin = Math.min(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);
  const xMax = Math.max(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);
  const lanes = buildLaneAssignments({ count, laneRatioFront: config.laneRatioFront, random });

  const clouds = Array.from({ length: count }, (_, index) => {
    const lane = lanes[index];
    const depth = lane === "front" ? config.laneDepthFront : config.laneDepthBack;

    return {
      id: `cloud-${index}`,
      x: lerp(xMin, xMax, random()),
      y: lerp(yMin, yMax, random()),
      z: Number.isFinite(depth) ? depth : 0,
      vx: Number.isFinite(config.horizontalDriftSpeed) ? config.horizontalDriftSpeed : 0,
      lane,
      styleVariant: Math.floor(random() * 3),
      recycleCount: 0,
    } satisfies CloudEntity;
  });

  return {
    tick: 0,
    seed,
    clouds,
  };
}

export function stepCloudState({ previousState, config, cameraFrame, deltaSeconds }: StepCloudStateInput): CloudState {
  const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const vx = Number.isFinite(config.horizontalDriftSpeed) ? config.horizontalDriftSpeed : 0;
  const lifecycleBands = sanitizeCloudLifecycleBands({
    spawnBandAboveCamera: config.spawnBandAboveCamera,
    despawnBandBelowCamera: config.despawnBandBelowCamera,
    minimumSeparation: MIN_CLOUD_LIFECYCLE_SEPARATION,
  });
  const thresholdY = cameraFrame.viewBottomY - lifecycleBands.despawnBandBelowCamera;
  const spawnMinY = cameraFrame.viewTopY;
  const spawnMaxY = cameraFrame.viewTopY + lifecycleBands.spawnBandAboveCamera;
  const xMin = Math.min(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);
  const xMax = Math.max(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);

  return {
    tick: previousState.tick + 1,
    seed: previousState.seed,
    clouds: previousState.clouds.map((cloud, index) => {
      const recycled = !Number.isFinite(cloud.y) || cloud.y < thresholdY;
      if (!recycled) {
        return {
          ...cloud,
          vx,
          x: cloud.x + vx * dt,
        };
      }

      const recycleRandom = createSeededRandom(
        previousState.seed + previousState.tick * 101 + index * 37 + (cloud.recycleCount + 1) * 13,
      );

      return {
        ...cloud,
        x: lerp(xMin, xMax, recycleRandom()),
        y: lerp(spawnMinY, spawnMaxY, recycleRandom()),
        z: laneDepthForCloud(cloud, config),
        vx,
        styleVariant: Math.floor(recycleRandom() * 3),
        recycleCount: cloud.recycleCount + 1,
      };
    }),
  };
}

export function sanitizeCloudLifecycleBands({
  spawnBandAboveCamera,
  despawnBandBelowCamera,
  minimumSeparation = 0,
}: CloudLifecycleBandsInput): SanitizedCloudLifecycleBands {
  const despawn = sanitizeBandValue(despawnBandBelowCamera);
  const requestedSpawn = sanitizeBandValue(spawnBandAboveCamera);
  const separation = sanitizeBandValue(minimumSeparation);

  return {
    despawnBandBelowCamera: despawn,
    spawnBandAboveCamera: Math.max(requestedSpawn, despawn + separation),
  };
}

export function shouldRespawnCloud(projected: CloudProjectedPoint): boolean {
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || !Number.isFinite(projected.z)) {
    return true;
  }

  const offBottom = projected.y > 1.25;
  const behindCamera = projected.z > 1.1;
  return offBottom || behindCamera;
}

export function resolveCloudSpawnNdcX(noise: number): number {
  const clampedNoise = clamp(noise, 0, 1);
  return -0.95 + clampedNoise * 1.9;
}

function buildLaneAssignments({
  count,
  laneRatioFront,
  random,
}: {
  count: number;
  laneRatioFront: number;
  random: () => number;
}): CloudLane[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [laneRatioFront >= 0.5 ? "front" : "back"];
  }

  const frontRatio = clamp(Number.isFinite(laneRatioFront) ? laneRatioFront : 0.5, 0, 1);
  const targetFrontCount = clampInt(Math.round(count * frontRatio), 1, count - 1);
  const laneByIndex = new Array<CloudLane>(count).fill("back");
  const indexPool = Array.from({ length: count }, (_, index) => index);

  for (let index = indexPool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = indexPool[index];
    indexPool[index] = indexPool[swapIndex];
    indexPool[swapIndex] = temp;
  }

  for (let index = 0; index < targetFrontCount; index += 1) {
    laneByIndex[indexPool[index]] = "front";
  }

  return laneByIndex;
}

function lerp(min: number, max: number, alpha: number): number {
  const clampedAlpha = clamp(alpha, 0, 1);
  return min + (max - min) * clampedAlpha;
}

function laneDepthForCloud(cloud: CloudEntity, config: CloudSimulationConfig): number {
  const depth = cloud.lane === "front" ? config.laneDepthFront : config.laneDepthBack;
  return Number.isFinite(depth) ? depth : 0;
}

function sanitizeBandValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.floor(clamp(value, min, max));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
