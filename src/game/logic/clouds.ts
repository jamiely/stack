import { createSeededRandom } from "./random";

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

export function initializeCloudState({ seed, config, cameraFrame }: InitializeCloudStateInput): CloudState {
  const random = createSeededRandom(seed);
  const count = clampCount(config.count);
  const cloudSpanY = Math.max(1, Math.abs(cameraFrame.viewTopY - cameraFrame.viewBottomY));
  const spawnBandAbove = Math.max(0, config.spawnBandAboveCamera);
  const yMin = cameraFrame.viewBottomY;
  const yMax = cameraFrame.viewTopY + spawnBandAbove + cloudSpanY;
  const xMin = Math.min(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);
  const xMax = Math.max(cameraFrame.visibleWorldXMin, cameraFrame.visibleWorldXMax);

  const clouds = Array.from({ length: count }, (_, index) => {
    const lane: CloudLane = random() < clamp(config.laneRatioFront, 0, 1) ? "front" : "back";
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
  const thresholdY = cameraFrame.viewBottomY - Math.max(0, config.despawnBandBelowCamera);
  const spawnMinY = cameraFrame.viewTopY;
  const spawnMaxY = cameraFrame.viewTopY + Math.max(0, config.spawnBandAboveCamera);
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

function lerp(min: number, max: number, alpha: number): number {
  const clampedAlpha = clamp(alpha, 0, 1);
  return min + (max - min) * clampedAlpha;
}

function laneDepthForCloud(cloud: CloudEntity, config: CloudSimulationConfig): number {
  const depth = cloud.lane === "front" ? config.laneDepthFront : config.laneDepthBack;
  return Number.isFinite(depth) ? depth : 0;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
